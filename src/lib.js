var birch = new (require('events').EventEmitter)(),
	net = require('net'),
	irc = require('slate-irc'),	
	consumers = {};


// Property filtering functions

function filterProps(props, filters) {
	var out = {};
	filters.forEach(function (filter) {
		if(props[filter]) {
			out[filter] = props[filter];
		}
	});
	return out;
}

function getConsumerProps(props) {
	return filterProps(props, ['suppressCrosstalk']);
}

function getNetworkProps(props) {
	return filterProps(props, ['connection', 'webircPass', 'identd']);
}

function getUserProps(props) {
	return filterProps(props, ['listens', 'speaks', 'nick', 'username',
	                           'realname', 'pass', 'ip', 'hostname']);
}

// Entity retrieval functions

function getConsumer(props, create) {
	// Creates a new consumer or returns an existing one.
	
	if(!consumers[props.key]) {
		if(!create) { throw Error('GET_CONSUMER_BAD_KEY'); }
		consumers[props.key] = {
			connected: false,
			props: getConsumerProps(props),
			users: {},
			networks: {}
		};
	}
	return consumers[props.key];
}

function getUser(props, create) {
	// Creates a new user or returns an existing one.
	
	var consumer = getConsumer(props),
		name = props.name;
	
	if(!name && props.network && props.nick) {
		try {
			name = consumer.networks[props.network].nicks[props.nick].name;
		} catch (e) { throw Error('GET_USER_BAD_NETWORK_OR_NICK'); }
	}
	
	if(name) {
		if(!consumer.users[name]) {
			if(!create) { throw Error('GET_USER_BAD_NAME'); }
			consumer.users[name] = {
				props: getUserProps(props),
				networks: {}
			};
		}
		return consumer.users[name];
	} else { throw Error('GET_USER_BAD_ARGS'); }
}

function getIrcClient(props, create) {
	// Creates a new IRC client or returns an existing one.
		
	var consumer = getConsumer(props),
		network, user, nick, socket, client;
	
	if(!props.name && props.network && props.nick) {
		try {
			return network.clients[props.nick].client;
		} catch (e) { throw Error('GET_IRC_CLIENT_BAD_NETWORK_OR_NICK'); }
	} else if(props.network && props.name) {
		user = getUser(props, create);
		if(!user) { throw Error('GET_IRC_CLIENT_BAD_USER'); }
		
		if(!consumer.networks[props.network]) {
			consumer.networks[props.network] = {
				props: getNetworkProps(props),
				clients: {}
			};
		}
				
		if(!user.networks[props.network]) {
			user.networks[props.network] = {
				nick: user.props.nick,
				channels: {}
			};
		}
		
		nick = user.networks[props.network].nick;
		network = consumer.networks[props.network];
		
		if(!network.clients[nick]) {
			if(!create) { throw Error('GET_IRC_CLIENT_NONEXISTANT'); }
			socket = net.connect(network.props.connection);
			client = irc(socket);
			
			attachStateHandlers(props, client);
			attachBroadcastHandlers(props, client);
			initializeConnection(props, client);
			
			network.clients[nick] = {
				name: props.name,
				socket: socket,
				client: client
			};
		}
		
		return network.clients[nick].client;
	} else { throw Error('GET_IRC_CLIENT_BAD_ARGS'); }
}


function initializeConnection (props, client) {
	var network = getConsumer(props);
	if(network.props.webircPass) {
		client.webirc(
			network.props.webircPass,
			props.username,
			props.hostname,
			props.ip
		);
	}

	if(props.pass) {
		client.pass(props.pass);
	}

	client.nick(props.nick);
	client.user(props.username, props.realname);
}


function attachStateHandlers(props, client) {
	// These update consumer data on nick, join, part, kick, kill, etc.
	// affecting this user.

	var consumer = getConsumer(props),
		user = getUser(props),
		userNetwork = user.networks[props.network],
		consumerNetwork = consumer.networks[props.network],
		nick = props.nick;
	
	client.on('join', function (e) {
		if(e.nick == nick) {
			userNetwork.channels[e.channel] = {
				incoming: [], outgoing: []
			};
		}
	});
	
	function changeNickTo(to) {
		userNetwork.nick = to;
		consumerNetwork.clients[to] = consumerNetwork.clients[nick];
		delete consumerNetwork.clients[nick];
	}
	
	client.on('nick', function (e) {
		if(e.nick == nick) { changeNickTo(e.new); }
	});
	
	client.on('welcome', function (e) {
		if(e.value != nick) { changeNickTo(e.value); }
	});
	
}


function attachBroadcastHandlers(props, client) {
	var consumer = getConsumer(props),
		user = getUser(props),
		network = props.network;

	if(!user.props.listens) { return; }
	
	["message", "notice", "invite", "names", "topic", "away",
	 "quit", "join", "part", "kick", "mode", "motd", "nick",
	 "welcome", "whois", "errors", "pong"].forEach(function (event) {
		client.on(event, function (data) {
			if(
				consumer.props.suppressCrosstalk &&
				consumer.networks[network].clients[data.nick]
			) { return; }

			if(typeof data === 'string') {
				var o = {};
				o[event == 'whois'? 'message': 'value'] = data;
				data = o;
			} else if(typeof data !== 'object' || data === null) {
				data = {};
			}

			data.type = event;
			data.network = network;
			data.user = props.name;

			if(consumer.connected) {
				birch.emit('event', data);
			} else {
				user.networks[network].channels[data.channel].
				  incoming.push([event, data]);
			}
		});
	});
}

// Public API

birch.connectConsumer = function (props) {
	var consumer = getConsumer(props, true);
	if(consumer.connected) { throw Error('CONSUMER_CONNECT_ALREADY_CONNECTED'); }
	consumer.connected = true;
	delete consumer.disconnectedAt;
	
	if(Object.keys(consumer.users).length) {
		birch.emit('status', consumer.users);
	}
};

birch.disconnectConsumer = function (props) {
	var consumer = getConsumer(props);
	consumer.connected = false;
	consumer.disconnectedAt = new Date();
};

birch.join = function (props) {
	var client = getIrcClient(props, true);
	client.join(props.channel);
};

birch.part = function (props) {
	var client = getIrcClient(props);
	
	client.part(props.channel, props.message);
	// TODO: Remove from data structure.
};

birch.send = function (props) {
	var client = getIrcClient(props);
	client.send(props.channel || props.recipient, props.message);
};

module.exports = birch;
