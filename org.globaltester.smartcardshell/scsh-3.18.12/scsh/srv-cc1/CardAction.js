/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2010 CardContact Software & System Consulting
 * |'##> <##'|  Andreas Schwier, 32429 Minden, Germany (www.cardcontact.de)
 *  ---------
 *
 *  This file is part of OpenSCDP.
 *
 *  OpenSCDP is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License version 2 as
 *  published by the Free Software Foundation.
 *
 *  OpenSCDP is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with OpenSCDP; if not, write to the Free Software
 *  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * @fileoverview Base class for all remote card related mechanisms
 */



/**
  * Create a new CardAction instance
  *
  * @param {CommonUI} ui the service ui used for error reporting (must support setErrorMessage) or null
  */
function CardAction(ui) {
	this.ui = ui;
	this.state = CardAction.NEW;
	this.requestPIN = -1;
}

exports.CardAction = CardAction;

CardAction.NEW = "new";
CardAction.NOCLIENT = "noclient";
CardAction.ERROR = "error";
CardAction.SUCCESS = "success";



/**
 * Return the page depending from the current state.
 * After the handleCard operation getPage returns null
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
CardAction.prototype.getPage = function(req, res, url) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getPage() : CardAction state: " + this.state);

	if (this.pending) {
		return this.getPendingPage(req, res);
	}

	switch(this.state) {
		case CardAction.NEW:
			this.state = CardAction.NOCLIENT;
			var page = this.getProgressPage(req, res);
			break;
		case CardAction.NOCLIENT:
			var page = this.getNoClientPage(req, res);
			this.state = CardAction.NEW;
			break;
		case CardAction.ERROR:
			var page = this.getErrorPage(req, res);
			this.state = CardAction.NEW;
			break;
		case CardAction.SUCCESS:	// reached after handleCard
			return null;
			break;
		default:
			var page = this.getProgressPage(req, res);
	}
	return page;
}



/**
 * Get the activation link for the redirect to the local client
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
CardAction.prototype.getActivationLink = function(req, res, requestPin) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var sessionId = req.getSession().id;
	var rndstr = Math.floor(Math.random() * 10000000).toString();
	var pathInfo = req.pathInfo;
	if (!pathInfo) {
		pathInfo = "";
	}
	var rturl = ApplicationServer.instance.serverURL + "/rt" + pathInfo;
	var url = "http://127.0.0.1:27001/" + rndstr + ".png?url=" + rturl + "&sessionId=" + sessionId;

	if (requestPin >= 0) {
		 url += "&pinrequired=" + requestPin;
	}

	return <img onload="window.location.reload()" onerror="alert('Could not connect to local client. Is the client running ?');window.location.reload()" src={url} width="16" height="16"/>;
}



/**
 * Serve this page to start the redirect to the local client
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
CardAction.prototype.getProgressPage = function(req, res) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var actlink = this.getActivationLink(req, res, this.requestPIN);
	if (actlink == null) {
		var page = this.getErrorPage(req, res);
		this.state = CardAction.NEW;
	} else {

		var page =
		<div>
			<h2>Smart card access in progress</h2>
			<p>Please wait for the green tick to appear. {actlink}</p>
			<p>Accessing the smart card may take a while, so please be patient. To follow the process
			   you can open the log window in the OCF daemon.</p>
			<p>The page will be reloaded automatically if JavaScript is enabled.</p>
			<p>If JavaScript is disabled, then press <a href="">continue</a> after the green tick is shown.</p>
		</div>
	}

	return page;
}



/**
 * Serve this page to start the redirect to the local client
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
CardAction.prototype.getPendingPage = function(req, res) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page =
		<div>
			<h2>Smart card access still in progress</h2>
			<p>Accessing the smart card may take a while, so please be patient. To follow the process
			   you can open the log window in the OCF daemon.</p>
			<p>Press <a href="">continue</a> after the client finished the operation.</p>
		</div>

	return page;
}



/**
 * Serve the error page if no local client was found
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
CardAction.prototype.getNoClientPage = function(req, res) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page =
		<div>
			<h2>Client connect</h2>
			<p>Could not connect to your local client or smart card.</p>
			<p>Please activate the local client to allow the server to access your card.</p>
			<p>You can start the local client using <a href="https://www.openscdp.org/ocf/ocf.jnlp">Java Web Start</a>
			   or by downloading and double-clicking on <a href="https://www.openscdp.org/ocf/ocf-cc.jar">ocf-cc.jar</a>.</p>
			<p>The local client can be started from the command line using</p>
			<pre>java -jar ocf-cc.jar -v</pre>
			<p>See also the <a href="https://www.openscdp.org/ocf/faq.html">FAQ</a> for more details
			   and troubleshooting hints.</p>
			<p>Press refresh or <a href="">continue</a> to proceed.</p>
		</div>

	return page;
}



/**
 * Serve the error page if some error occured during card communication
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
CardAction.prototype.getErrorPage = function(req, res) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page =
		<div>
			<h2>Error while talking to your smart card</h2>
			<p>Press refresh or <a href="">continue</a> to proceed.</p>
		</div>

	return page;
}



/**
 * Get the return code from a service operation called by handleCard
 *
 * @return the returnCode from the remote system
 */
CardAction.prototype.reportError = function(msg) {
	if (this.ui) {
		this.ui.setErrorMessage("Error", msg);
	}
	this.state = CardAction.ERROR;
}



/**
 * Get the return code from a service operation called by handleCard
 *
 * @return the returnCode from the remote system
 */
CardAction.prototype.getReturnCode = function() {
	return this.state;
}



CardAction.prototype.handleCardAction = function(card, session, pathInfo) {
	return "Not Implemented";
}



/**
 */
CardAction.prototype.handleCard = function(session, pathInfo) {
	GPSystem.log(GPSystem.DEBUG, module.id, "Handling card for session " + session.id);

	this.pending = true;

	try	{
		if (session.cardTerminal) {
			var card = new Card(session.cardTerminal);
		} else {
			var card = new Card(session.id);
		}
		this.handleCardAction(card, session, pathInfo);
	}
	catch(e if e instanceof GPError) {
		GPSystem.log(GPSystem.ERROR, module.id, e);
		GPSystem.log(GPSystem.ERROR, module.id, e.stack);
		this.reportError(e.message);
	}
	finally {
		GPSystem.log(GPSystem.DEBUG, module.id, "CardAction state: " + this.state);
		card.close();
		this.pending = false;
	}
}
