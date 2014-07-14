Birch
=====

An IRC bouncer with a sane API, written in Node.js.

**Warning: The code was recently forked from the scrollback project's IRC client and still needs to be cleaned up and stripped of Scrollback concepts. It isn't ready for production use yet.**

Purpose
-------

Birch is intended primarily for use by web-based IRC clients that need to manage large numbers of client and bot connections efficiently. It can also probably be used by a traditional desktop client as well.

The project's priority is to offer a simple, modern API to interact with IRC networks. It aims to gracefully handle downtime and caching, integrate with different networks' spam prevention methods (WEBIRC, identd) and makes common services such as NickServ and ChanServ first-class citizens of the API.

