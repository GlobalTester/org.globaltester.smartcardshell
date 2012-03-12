package org.globaltester.smartcardshell;

import java.util.Collection;
import java.util.LinkedList;

import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IConfigurationElement;
import org.eclipse.core.runtime.Platform;
import org.globaltester.logging.logger.GtErrorLogger;
import org.globaltester.smartcardshell.protocols.IScshProtocolProvider;

public class ProtocolExtensions {

	public static final String PROTOCOLS_EXTENSION_POINT = "org.globaltester.smartcardshell.protocols";

	private static ProtocolExtensions instance = new ProtocolExtensions();

	private LinkedList<IScshProtocolProvider> protocolList;

	private ProtocolExtensions() {
	}

	public static ProtocolExtensions getInstance() {
		return instance;
	}

	@SuppressWarnings("unchecked")
	synchronized
	public Collection<IScshProtocolProvider> getAllAvailableProtocols() {
		
		if (protocolList != null) {
			return (Collection<IScshProtocolProvider>) protocolList.clone();  
		} else {
			protocolList = new LinkedList<IScshProtocolProvider>();
		}
		
		IConfigurationElement[] configElements = Platform.getExtensionRegistry()
				.getConfigurationElementsFor(PROTOCOLS_EXTENSION_POINT);
		try {
			for (IConfigurationElement curConfigElem : configElements) {
				final Object o = curConfigElem
						.createExecutableExtension("class");
				if (o instanceof IScshProtocolProvider) {
					IScshProtocolProvider curProvider = (IScshProtocolProvider) o;
					curProvider.setName(curConfigElem.getAttribute("name"));
					protocolList.add(curProvider);
				}
			}
		} catch (CoreException ex) {
			// Extension could not be loaded into ECMAScript
			// log CoreException to eclipse log
			GtErrorLogger.log(Activator.PLUGIN_ID, ex);
		}
		
		return (Collection<IScshProtocolProvider>) protocolList.clone();
	}
	
	public IScshProtocolProvider get(String protocolName) {
		for (IScshProtocolProvider curConfigElem : getAllAvailableProtocols()) {
			if (curConfigElem.getName().equals(protocolName)) {
				return curConfigElem;
			}
		}
		return null;
	}

}
