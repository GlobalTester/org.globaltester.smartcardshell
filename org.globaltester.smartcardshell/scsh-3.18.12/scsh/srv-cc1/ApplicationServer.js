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
 * @fileoverview A simple application server supporting a web UI, SOAP services and remote card terminals
 */


var AuthenticationWizard	= require('scsh/srv-cc1/AuthenticationWizard').AuthenticationWizard;
var CardAction			= require('scsh/srv-cc1/CardAction').CardAction;
var File			= require('scsh/file/File').File;



/**
 * Creates an application server instance.
 *
 * @class <p>Provides for a simple application server.</p>
 *
 * @constructor
 */
function ApplicationServer() {
	this.ports = [];
	this.uiPort = 8080;
	this.restarted = true;
	if (__ServletContext) {
		this.contextPath = __ServletContext.getContextPath();
	} else {
		this.contextPath = "";
	}

	this.parseServerConf();

	this.setServerURL("http://localhost:" + this.uiPort);
}

exports.ApplicationServer = ApplicationServer;



/**
 * Set server url. The servlet context path is appended.
 *
 * @param {String} url the server URL (Default http://localhost:8080)
 */
ApplicationServer.prototype.setServerURL = function(url) {
	this.serverURL = url.concat(this.contextPath);
	GPSystem.log(GPSystem.INFO, module.id, "Server URL: " + url);
}



/**
 * Determine server port from jetty configuration
 *
 */
ApplicationServer.prototype.parseServerConf = function() {
	var f = new File("etc/server.conf", GPSystem.USR);

	if (!f.exists()) {
		var f = new File("etc/server.conf", GPSystem.SYS);
	}

	if (f.exists()) {
		var s = f.readAllAsString();
		var lines = s.split("\n");
		for (var i = 0; i < lines.length; i++) {
			var s = lines[i];
			if (s.indexOf("scriptingserver.mainport.port") == 0) {
				var p = s.substr(s.indexOf("=") + 1);
				this.uiPort = parseInt(p);
			}
		}
		f.close();
	}
}



/**
 * Register an object that provides web services for a given relative url.
 *
 * @param {url} url the relativ URL under which the service responds
 * @param {Object} soapService the service implementation that serves POST requests
 * @param {Object} uiFactory a factory that can create new UI objects using the newUI() method
 */
ApplicationServer.prototype.registerService = function(url, soapService, uiFactory, cardHandler) {
	port = this.uiPort;

	if (!this.ports[port]) {
		this.ports[port] = [];
	}

	this.ports[port][url] = { url: url, service: soapService, ui: uiFactory, cardHandler: cardHandler };
}



/**
 * Register a service based on a service descriptor
 *
 * The service descriptor may contain an object reference for uiFactory, soapService, cardHandler and restHandler.
 *
 * uiFactory is an object providing a newUI(session) method, called by the ApplicationServer for each new session
 * started with the service.
 *
 * soapService is an object providing SOAP calls as methods taking the soap body, http request and http response as
 * parameter. Each webservice method must be marked in the function prototype with WebService=true.
 *
 * restHandler is an object providing a handleREST(req, res) method to process RESTfull requests.
 *
 * cardHandler is an object providing a handleCard() method that processes inbound requests at the remote terminal interface
 *
 * @param {url} url the relativ URL under which the service responds
 * @param {Object} desc the service decriptor
 * @param {Number} port the port this service shall be bound to (optional, default bound to UI port)
 */
ApplicationServer.prototype.registerServiceForURL = function(url, desc, port) {
	if (!port) {
		port = this.uiPort;
	}

	if (!this.ports[port]) {
		this.ports[port] = [];
	}

	this.ports[port][url] = {
		url: url,
		name: desc.name,
		description: desc.description,
		service: desc.soapService,
		ui: desc.uiFactory,
		cardHandler: desc.cardHandler,
		restHandler: desc.restHandler };
}



/**
 * Set an AuthorizationManager object to enforce user authentication
 *
 * @param {AuthorizationManager} authorizationManager the authorization manager to use for authentication
 * @param {Boolean} pinNotRequired do not explicity request PIN verification, but perform card authentication only
 */
ApplicationServer.prototype.setAuthorizationManager = function(authorizationManager, pinNotRequired) {
	this.authorizationManager = authorizationManager;
	this.pinRequired = !pinNotRequired;
}



/**
 * Enable the PKI-as-a-Service style for the AuthenticationWizard
 */
ApplicationServer.prototype.enablePaaSStyle = function() {
	this.style = AuthenticationWizard.STYLE_PAAS;
}



/**
 * Return session associated with req.
 *
 * If the scripting environment has been restarted, then invalidate the session first
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
ApplicationServer.prototype.getSession = function(req, res) {
    	var session = req.getSession();

	if (this.restarted) {							// For development purposes invalidate the current UI session
		session.nativeSession.invalidate();
		session = req.getSession();
		this.restarted = false;
	}
	return session;
}



/**
 * Redirect to first server with a UI
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
ApplicationServer.prototype.redirectToFirstUI = function(req, res) {
	var s = { url: ".." };

	var registry = this.ports[this.uiPort];

	for (var i in registry) {
		s = registry[i];
		if (s.ui) {
			break;
		}
	}
	GPSystem.log(GPSystem.DEBUG, module.id, "Redirect to " + this.contextPath + "/se/" + s.url);
	res.setStatus(HttpResponse.SC_SEE_OTHER);
	res.addHeader("Location", this.contextPath + "/se/" + s.url );
	return;
}



/**
 * Ensure authentication, if configured
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
ApplicationServer.prototype.statusPage = function(req, res) {
    	var session = this.getSession(req, res);

	// No authentication required or authentication performed
	if ((typeof(this.authorizationManager) == "undefined") || session.cardState) {
		if (session.startURL) {
			res.setStatus(HttpResponse.SC_SEE_OTHER);
			res.addHeader("Location", this.contextPath + "/se" + session.startURL );
			delete session.startURL;
		} else {
			this.redirectToFirstUI(req, res);
		}

		return;
	}

	GPSystem.log(GPSystem.DEBUG, module.id, "Processing AuthenticationWizard");

	if (typeof(session.wizard) == "undefined") {
		GPSystem.log(GPSystem.DEBUG, module.id, "Create new AuthenticationWizard");
		session.wizard = new AuthenticationWizard(null, this.authorizationManager, this.pinRequired, this.style);
	}

	var page = session.wizard.getPage(req, res);

	if (page) {
		session.wizard.sendPage(req, res, page);
	} else {
		// Wizard has completed
		var rc = session.wizard.getReturnCode();
		GPSystem.log(GPSystem.DEBUG, module.id, "AuthenticationWizard completed with " + rc);

		delete session.wizard;

		res.setStatus(HttpResponse.SC_SEE_OTHER);
		res.addHeader("Location", this.contextPath + "/se" );
	}
}



/**
 * Logout user from server
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
ApplicationServer.prototype.logout = function(req, res) {
	GPSystem.log(GPSystem.DEBUG, module.id, "logout() called");

    	var session = this.getSession(req, res);

	delete session.cardState;
	delete session.userId;
	delete session.user;
	res.setStatus(HttpResponse.SC_SEE_OTHER);
	res.addHeader("Location", this.contextPath + "/se");
}



/**
 * Generate a list of services that provide a UI
 */
ApplicationServer.prototype.getUIList = function() {
	var list = [];

	var registry = this.ports[this.uiPort];

	for (var i in registry) {
		var spec = registry[i];
		if (spec.ui) {
			var url = this.contextPath + "/se/" + spec.url;
			var name = spec.name;
			if (!name) {
				name = spec.url;
			}
			var entry = { id: spec.url, name: name, description: spec.description, url: url, roleRequired: spec.ui.roleRequired };
			list.push(entry);
		}
	}

	return list;
}



/**
 * Dispatch a SOAP request to the addressed service
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 * @param {Object} service the service entry in the registry
 */
ApplicationServer.prototype.dispatchSOAPRequest = function(req, res, service) {
	try	{
		var soapenv = req.getEntityAsXML();

		GPSystem.log(GPSystem.INFO, module.id, "Received SOAP message for " + req.pathInfo);
		GPSystem.log(GPSystem.DEBUG, module.id, soapenv);

		if (typeof(service.service) == "undefined") {
			GPSystem.log(GPSystem.ERROR, module.id, "No SOAP service available at this URL");
			res.setStatus(HttpResponse.SC_BAD_REQUEST);
			return;
		}

		var soapns = soapenv.namespace();
		var soap12 = (soapns == "http://www.w3.org/2003/05/soap-envelope")

		var soapprefix = soapns.prefix;

		var soapbody = soapenv.soapns::Body.elements()[0];
		var method = soapbody.localName();
		var bodyns = soapbody.namespace();

		var servicehandler = service.service[method];
		if ((typeof(servicehandler) != "function") || (typeof(servicehandler.WebService) == "undefined")) {
			GPSystem.log(GPSystem.ERROR, module.id, "No implementation found for message " + method);
			res.setStatus(HttpResponse.SC_NOT_FOUND);
			return;
		}

		var result = service.service[method](soapbody, req, res);

		var response =
		<{soapprefix}:Envelope xmlns:{soapprefix}={soapns}>
			<{soapprefix}:Header/>
			<{soapprefix}:Body>
			<response/>
			</{soapprefix}:Body>
		</{soapprefix}:Envelope>;

		response.soapns::Body.response = result;

		if (soap12) {
			res.setContentType("application/soap+xml; charset=utf-8");
		} else {
			res.setContentType("text/xml; charset=utf-8");
		}

		var responseStr = response.toXMLString();
		GPSystem.log(GPSystem.INFO, module.id, "Responding with SOAP message for " + req.pathInfo);
		GPSystem.log(GPSystem.INFO, module.id, responseStr);

		res.print(responseStr);
	}
	catch(e) {
		GPSystem.log(GPSystem.ERROR, module.id, "Exception during SOAP processing in " + e.fileName + "#" + e.lineNumber);
		GPSystem.log(GPSystem.ERROR, module.id, e);
		res.setStatus(HttpResponse.SC_BAD_REQUEST);
	}
}



/**
 * Dispatch a REST request to the addressed service
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 * @param {Object} service the service entry in the registry
 */
ApplicationServer.prototype.dispatchRESTRequest = function(req, res, service) {
	return service.restHandler.handleRequest(req, res);
}



/**
 * Dispatch a UI request to the addressed service
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 * @param {Object} service the service entry in the registry
 */
ApplicationServer.prototype.dispatchUIRequest = function(req, res, service) {
    	var session = this.getSession(req, res);

	if (this.authorizationManager && !session.user) {
		session.startURL = req.pathInfo;
		if (req.queryString) {
			session.startURL = session.startURL + "?" + req.queryString;
		}
		res.setStatus(HttpResponse.SC_SEE_OTHER);
		res.addHeader("Location", this.contextPath + "/se");
		return;
	}

	if (typeof(session.ui) == "undefined") {
		session.ui = [];
	}

	if (typeof(session.ui[service.url]) == "undefined") {
		session.ui[service.url] = service.ui.newUI(session);
	}

	session.ui[service.url].handleRequest(req, res);
}



/**
 * Dispatch a card update request to the addressed service
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 * @param {Object} service the service entry in the registry
 */
ApplicationServer.prototype.performCardUpdate = function(session, pathInfo, queryInfo) {
	GPSystem.log(GPSystem.DEBUG, module.id, "Application server performs card update for " + pathInfo + " " + queryInfo);
	if (!pathInfo) {			// Handle SmartCard Login
		if (session.wizard) {
			session.wizard.handleCard(session, pathInfo, queryInfo);
		}
		return;
	}

	var url = pathInfo.split("/");

	var registry = this.ports[this.uiPort];

	if (!registry) {
		GPSystem.log(GPSystem.ERROR, module.id, "No service registered for port " + port);
		res.setStatus(HttpResponse.SC_NOT_FOUND);
		return;
	}

	var service = registry[url[1]];

	if (!service) {
		GPSystem.log(GPSystem.ERROR, module.id, "Service URL " + pathInfo + " not defined");
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "Service URL " + pathInfo + " not defined");
	}

	if ((typeof(session.ui) == "undefined") || (typeof(session.ui[service.url]) == "undefined")) {
		GPSystem.log(GPSystem.DEBUG, module.id, "Service URL " + pathInfo + " has no active UI session");
		if (service.cardHandler) {
			return service.cardHandler.handleCard(session, pathInfo, queryInfo);
		}
		return;
	}

	session.ui[service.url].handleCard(session, pathInfo, queryInfo);
}



/**
 * Dispatches calls to service or GUI class.
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
ApplicationServer.prototype.handleRequest = function(req, res) {
	var port = req.localPort;

	if (!port) {				// Ensure backwards compatiblity for server without req.localPort
		port = this.uiPort;
	}

	if (req.pathInfo == null) {
		if (port == this.uiPort) {
			this.statusPage(req, res);
		} else {
			res.setStatus(HttpResponse.SC_METHOD_NOT_ALLOWED);
		}
	} else {
		req.url = req.pathInfo.substr(1).split("/");

		var registry = this.ports[port];

		if (!registry) {
			GPSystem.log(GPSystem.ERROR, module.id, "No service registered for port " + port);
			res.setStatus(HttpResponse.SC_NOT_FOUND);
			return;
		}

		var service = registry[req.url[0]];

		if (!service) {
			GPSystem.log(GPSystem.ERROR, module.id, "Service URL " + req.pathInfo + " not defined");
			res.setStatus(HttpResponse.SC_NOT_FOUND);
			return;
		}

		if (req.method == "GET") {
			if (req.queryString &&
					((req.queryString.toLowerCase() == "wsdl") ||
					 (req.queryString.substr(0, 3).toLowerCase() == "xsd"))) {
				if (typeof(service.service.GetWSDL) != "undefined") {
					GPSystem.log(GPSystem.DEBUG, module.id, req.queryString);
					service.service.GetWSDL(req, res);
				} else {
					GPSystem.log(GPSystem.DEBUG, module.id, "No WSDL found");
					res.setStatus(HttpResponse.SC_NOT_FOUND);
				}
			} else if (service.restHandler) {
				GPSystem.log(GPSystem.DEBUG, module.id, "Received REST GET for " + req.pathInfo);
				this.dispatchRESTRequest(req, res, service);
			} else {
				GPSystem.log(GPSystem.DEBUG, module.id, "Received GET for " + req.pathInfo);
				this.dispatchUIRequest(req, res, service);
			}
		} else if (req.method == "POST") {
			GPSystem.log(GPSystem.DEBUG, module.id, "Content-type : " + req.contentType);
			// SOAP 1.2 requires "application/soap+xml"
			// SOAP 1.1 defines "text/xml
			if (req.contentType && ((req.contentType.substr(0, 8).toLowerCase()  == "text/xml") ||
				(req.contentType.substr(0, 20).toLowerCase() == "application/soap+xml"))) {
				this.dispatchSOAPRequest(req, res, service);
			} else if (req.contentType && service.restHandler && (req.contentType.substr(0, 16).toLowerCase()  == "application/json")) {
				GPSystem.log(GPSystem.DEBUG, module.id, "Received REST POST for " + req.pathInfo);
				this.dispatchRESTRequest(req, res, service);
			} else {
				GPSystem.log(GPSystem.DEBUG, module.id, "Received POST for " + req.pathInfo);
				this.dispatchUIRequest(req, res, service);
			}
		} else {
			GPSystem.log(GPSystem.ERROR, module.id, "Method " + req.method + " not supported");
			res.setStatus(HttpResponse.SC_METHOD_NOT_ALLOWED);
		}
	}
}



//
// Create global server instance
//
ApplicationServer.instance = new ApplicationServer();

GPSystem.log(GPSystem.INFO, module.id, "ApplicationServer instance created");
