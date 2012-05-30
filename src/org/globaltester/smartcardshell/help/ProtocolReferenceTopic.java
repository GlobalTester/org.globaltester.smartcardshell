package org.globaltester.smartcardshell.help;

import java.util.Iterator;
import java.util.List;

import org.eclipse.core.runtime.IConfigurationElement;
import org.globaltester.help.Topic;
import org.globaltester.smartcardshell.ProtocolExtensions;
import org.globaltester.smartcardshell.protocols.IScshProtocolProvider;

public class ProtocolReferenceTopic extends Topic {

	private static final Object HTML_HEAD_BEGIN = "<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\" \"http://www.w3.org/TR/html4/loose.dtd\">\n"
			+ "<html>\n"
			+ "\t<head>\n"
			+ "\t\t<meta http-equiv=\"Content-Type\" content=\"text/html; charset=ISO-8859-1\">\n";
	private static final Object HTML_HEAD_END = "\t</head>\n";
	private static final Object HTML_BODY_BEGIN = "\t<body>\n";
	private static final Object HTML_BODY_END = "\t</body>\n</html>";

	public ProtocolReferenceTopic(IConfigurationElement curConfigElem) {
		super(curConfigElem.getAttribute("name"));

		String name = curConfigElem.getAttribute("name");

		IScshProtocolProvider pExt = ProtocolExtensions.getInstance().get(name);

		href = "html/user/refernce/scshprotocols/" + name + ".html";
		String title = "";

		StringBuffer helpPageContent = new StringBuffer();
		helpPageContent.append(HTML_HEAD_BEGIN);
		helpPageContent.append("\t\t<title>" + title + "</title>");

		helpPageContent.append(HTML_HEAD_END);
		helpPageContent.append(HTML_BODY_BEGIN);
		helpPageContent.append("\t\t<h1>" + title + "</h1>");

		appendCommandSummary(helpPageContent, pExt);
		appendCommandDetails(helpPageContent, pExt);

		helpPageContent.append(HTML_BODY_END);

		ContentProducer.registerContent(href, helpPageContent.toString());
	}

	private void appendCommandSummary(StringBuffer helpPageContent,
			IScshProtocolProvider pExt) {

		helpPageContent.append("\t\t<h2>Command summary</h2>\n");

		helpPageContent.append("\t\t<table>\n");
		for (String curCommand : pExt.getCommands()) {
			helpPageContent.append("\t\t<tr>");
			helpPageContent.append("<td>"
					+ getCommandCodeBlock(pExt, curCommand) + "<br/>");
			helpPageContent.append("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
					+ pExt.getHelp(curCommand) + "</td>");
			helpPageContent.append("</tr>");

		}
		helpPageContent.append("\t\t</table>\n");

	}

	private String getCommandCodeBlock(IScshProtocolProvider pExt,
			String curCommand) {
		StringBuffer codeBlock = new StringBuffer();
		codeBlock.append("<code>");
		codeBlock.append("card.gt_" + pExt.getName() + "_" + curCommand);
		codeBlock.append("(");
		for (Iterator<String> paramIter = pExt.getParams(curCommand).iterator(); paramIter
				.hasNext();) {
			codeBlock.append(paramIter.next());
			if (paramIter.hasNext()) {
				codeBlock.append(", ");
			}
		}
		codeBlock.append(")");
		codeBlock.append("</code>");
		return codeBlock.toString();
	}

	private void appendCommandDetails(StringBuffer helpPageContent,
			IScshProtocolProvider pExt) {
		helpPageContent.append("\t\t<h2>Command details</h2>\n");

		for (String curCommand : pExt.getCommands()) {
			helpPageContent.append(getDetailedCommandBlock(pExt, curCommand));
			helpPageContent.append("<hr/>\n");
		}

	}

	private String getDetailedCommandBlock(IScshProtocolProvider pExt,
			String curCommand) {
		StringBuffer commandBlock = new StringBuffer();
		commandBlock.append("<h3>" + curCommand + "</h3>");
		commandBlock.append(getCommandCodeBlock(pExt, curCommand));
		commandBlock.append("<p>" + pExt.getHelp(curCommand) + "</p>");

		List<String> params = pExt.getParams(curCommand);
		if ((params != null) && (params.size() > 0)) {
			commandBlock.append("<p><b>Parameters:</b><br/>");
			for (String curParam : params) {
				commandBlock.append("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<code>"+curParam+"</code> - " + pExt.getHelpParam(curCommand, curParam)+"<br/>");	
			}
			commandBlock.append("</p>");
		}

		String retHelp = pExt.getHelpReturn(curCommand);
		if ((retHelp != null) && (retHelp.trim().length() > 0)) {
			commandBlock.append("<p><b>Returns:</b><br/>");
			commandBlock.append(retHelp);
			commandBlock.append("</p>");
		}

		return commandBlock.toString();
	}
}
