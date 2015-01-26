```javascript
// The representation of a consumer.
// Contains details of outgoing users only.

// The consumer is responsible for processing
// incoming away and back messages for
// users on IRC and keeping track of them.

{
	connected: <flag>,
	disconnectedAt: <date>,
	props: {
		suppressCrosstalk: <flag>
	},
	users: {
		<name>: {
			props: {
				listens: <flag>,
				speaks: <flag>,
				nick: <string>,
				username: <string>,
				realname: <string>,
				pass: <string>,
				ip: <string>,
				hostname: <string>
			},
			networks: {
				<network>: {
					nick: <nick>,
					channels: {
						<channel>: {
							incoming: [<Message>],
							outgoing: [<Message>]
						}
					}
				}
			}
		}
	},
	networks: {
		<network>: {
			props: {
				webircPass: <string>,
				identd: <hex|dec|host>
			},
			clients: {
				<nick>: {
					name: <name>,
					lastContactAt: <date>,
					socket: <TcpSocket>,
					client: <IrcClient>
				}
			}
		}
	}
}
```