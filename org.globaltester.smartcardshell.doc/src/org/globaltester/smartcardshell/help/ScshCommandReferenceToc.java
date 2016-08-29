package org.globaltester.smartcardshell.help;

//import org.eclipse.core.runtime.IConfigurationElement;
//import org.eclipse.core.runtime.Platform;
import org.eclipse.help.IToc;
import org.globaltester.base.doc.help.Toc;
import org.globaltester.base.doc.help.Topic;
//import org.globaltester.smartcardshell.ProtocolExtensions;
//import org.globaltester.smartcardshell.protocols.IScshProtocolProvider;

public class ScshCommandReferenceToc extends Toc {

	private static ScshCommandReferenceToc instance;

	public ScshCommandReferenceToc(String nLabel, String nHref) {
		super(nLabel, nHref);
	}

	public static synchronized IToc getInstance() {
		if (instance == null) {
			initializeInstance();
		}
		return instance;
	}

	private static void initializeInstance() {
		instance = new ScshCommandReferenceToc("SCSH commands", "html/user/reference/ScshCommandReference.html");

		// create main topic with href to static content
		Topic t = new Topic("SmartCardShell command reference",
				"html/user/reference/ScshCommandReference.html");
		instance.addTopic(t);

// #746 reanable and repair the following code
		
		// create subTopics for each protocol
//		IConfigurationElement[] configElements = Platform
//				.getExtensionRegistry().getConfigurationElementsFor(
//						ProtocolExtensions.PROTOCOLS_EXTENSION_POINT);
//		for (IConfigurationElement curConfigElem : configElements) {
//
//			String curProtocolName = curConfigElem.getAttribute("name");
//			IScshProtocolProvider curProtocol = ProtocolExtensions.getInstance().get(
//					curProtocolName);
//			if ((curProtocol != null) && (curProtocol.getCommands() != null)
//					&& (curProtocol.getCommands().size() > 0)) {
//				t.addSubtopic(new ProtocolReferenceTopic(curConfigElem));
//			}
//		}

	}

	private void addTopic(Topic t) {
		if (t != null) {
			topics.add(t);
		}
	}

}
