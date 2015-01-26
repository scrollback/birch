```javascript
// Schema for event objects emitted by birch.


{
	type,
	channel, nick, hostmask, message,
	
	client (nick of person being acted on),
	target (channel being acted on),
	
	channels // part
	
	from, to // notice and privmsg
	
	mode // mode
	motd // motd
	topic // topic
	new  // nick
	names: [{name: (nick), mode: string}], // names
	
	value: // welcome
	cmd (full error code) // errors
	
	hostname, username, realname, server,
  channels, sign, idle, oper, away // whois
}


```