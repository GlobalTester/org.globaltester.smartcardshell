package org.globaltester.smartcardshell.help;

import org.eclipse.core.runtime.IConfigurationElement;
import org.globaltester.help.Topic;
import org.globaltester.smartcardshell.ProtocolExtensions;
import org.globaltester.smartcardshell.protocols.IScshProtocolProvider;

public class ProtocolReferenceTopic extends Topic {

	private static final Object HTML_HEAD_BEGIN = "<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\" \"http://www.w3.org/TR/html4/loose.dtd\">\n"+
	"<html>\n"+
	"\t<head>\n"+
	"\t\t<meta http-equiv=\"Content-Type\" content=\"text/html; charset=ISO-8859-1\">\n";
	private static final Object HTML_HEAD_END = "\t</head>\n";
	private static final Object HTML_BODY_BEGIN = "\t<body>\n";
	private static final Object HTML_BODY_END = "\t</body>\n</html>";
	
	
		
	

	public ProtocolReferenceTopic(IConfigurationElement curConfigElem) {
		super(curConfigElem.getAttribute("name"));
		
		String name = curConfigElem.getAttribute("name");
		
		IScshProtocolProvider pExt = ProtocolExtensions.getInstance().get(name);
		
		href = "html/user/refernce/scshprotocols/"+name+".html";
		String title = "";
		
		StringBuffer helpPageContent = new StringBuffer();
		helpPageContent.append(HTML_HEAD_BEGIN);
		helpPageContent.append("\t\t<title>" + title + "</title>");
		
		helpPageContent.append(HTML_HEAD_END);
		helpPageContent.append(HTML_BODY_BEGIN);
		helpPageContent.append("\t\t<h1>" + title + "</h1>");
		
		for (String curCommand : pExt.getCommands()) {
			helpPageContent.append("\t\t<p>");
			helpPageContent.append("<code> card.gt_"+name+"_"+curCommand + "</code><br/>");
			helpPageContent.append(pExt.getHelp(curCommand));
			helpPageContent.append("</p>");
			
		}
		
		helpPageContent.append(HTML_BODY_END);

		ContentProducer.registerContent(href, helpPageContent.toString());
	}

}
