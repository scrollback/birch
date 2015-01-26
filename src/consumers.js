/*
	TODO:
		Exponential backoff,
		Identd
*/

var config = require('./configLoader'),
	net = require('net'),
	irc = require('slate-irc'),	
	consumers = {};

function getConsumerProps(props) {
	return {
		suppressCrosstalk: props.suppressCrosstalk
	};
}

function getUserProps(props) {
	return {
		listens: props.listens,
		speaks: props.speaks,
		nick: props.nick,
		username: props.username,
		realname: props.realname,
		pass: props.pass,
		ip: props.ip,
		hostname: props.hostname
	};
}

function getConsumer(props) {
	if(!consumers[props.key]) {
		consumers[props.key] = {
			connected: false,
			props: getConsumerProps(props),
			users: {},
			networks: {}
		};
	}
	return consumers[key];
}

function getUser(props) {
	var consumer = getConsumer(props.key),
		name = props.name;
	
	if(!name && props.network && props.nick) {
		try {
			name = consumer.networks[props.network].nicks[props.nick].name;
		} catch (e) {
			throw Error('GET_USER_BAD_NETWORK_OR_NICK');
		}
	}
	
	if(name) {
		if(!consumer.users[name]) {
			consumer.users[name] = {
				props: getUserProps(props),
				networks: {}
			};
		}
		return consumer.users[name];
	} else {
		throw Error('GET_USER_BAD_ARGS');
	}
}

function getIrcClient(props) {
	var consumer = getConsumer(props.key),
		network = consumer.networks[props.network],
		user, nick, socket, client;
	
	if(props.network && props.nick) {
		try {
			return network.clients[props.nick].client;
		} catch (e) {
			throw Error('GET_IRC_CLIENT_BAD_NETWORK_OR_NICK');
		}
	} else if(props.network && props.name) {
		user = getUser(props);
		
		if(!consumer.networks[props.network]) {
			consumer.networks[props.network] = {
				props: config(props.network).properties,
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
		
		if(!network.clients[nick]) {
			
			// Creating a new client connection.
			
			socket = net.connect(config(props.network).connection);
			client = irc(socket);
			
			initializeConnection(network, props, client);
			attachListeners(consumer, props.network, nick, client, props.emitter);
			
			network.clients[nick] = {
				name: props.name,
				socket: socket,
				client: client
			};
		}
		
		return network.clients[nick];
	} else {
		throw Error('GET_IRC_CLIENT_BAD_ARGS');
	}
}

function initializeConnection (network, props, client) {
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

// Update data structures on nick, join, part, kick, kill, etc.
// affecting a user.

function attachListeners(consumer, network, nick, client, emitter) {
	var username = consumer.networks[network].clients[nick].name,
		user = consumer.users[username];
	
	["message", "notice", "invite", "names", "topic", "away",
	 "quit", "join", "part", "kick", "mode", "motd", "nick",
	 "welcome", "whois", "errors", "pong"].forEach(function (event) {
		client.on(event, function (data) {
			if(consumer.props.suppressCrosstalk &&
			   consumer.networks[network].clients[data.nick]) return;
			
			if(typeof data === 'string') {
				var o = {};
				o[event == 'whois'? 'message': 'value'] = data;
				data = o;
			} else if(typeof data !== 'object' || data === null) {
				data = {};
			}
			
			data.type = event;
			data.network = network;
			data.user = username;
			
			if(user.props.listens && typeof emitter == 'function') {
				if(consumer.connected) {
					emitter.emit(event, data);
				} else {
					user.networks[network].channels[data.channel].
					  incoming.push([event, data]);
				}
			}
		});
	});
	
	client.on('join', function (e) {
		if(e.nick == nick) {
			user.networks[network].channels[e.channel] = {
				incoming: [], outgoing: []
			};
		}
	});
	
	client.on('nick', function (e) {
		
	});
	
}
