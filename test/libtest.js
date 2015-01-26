var birch = require('../src/lib.js');

birch.on('status', console.log.bind(console));
birch.on('event', console.log.bind(console));

birch.connectConsumer({key: 'testing'});
birch.join({
	key: 'testing',
	name: 'aravind',
	
	nick: 'aravind',
	username: 'aravind',
	hostname: 'scrollback.io',
	realname: 'Aravind R S',
	listens: true,
	
	network: 'localhost',
	connection: {host: 'localhost', port: 6667},
	channel: '#testing'
});


birch.send({ key: 'testing', name: 'aravind', network: 'localhost', channel: '#testing',
		   message: 'hi'});
