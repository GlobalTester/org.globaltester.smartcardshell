package org.globaltester.smartcardshell.help;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.util.HashMap;
import java.util.Locale;

import org.eclipse.help.IHelpContentProducer;
import org.globaltester.logging.legacy.logger.GtErrorLogger;
import org.globaltester.smartcardshell.doc.Activator;

public class ContentProducer implements IHelpContentProducer {
	private static HashMap<String, String> contentMap = new HashMap<String, String>();

	@Override
	public InputStream getInputStream(String pluginID, String href,
			Locale locale) {
		if ((pluginID == null) || !Activator.PLUGIN_ID.equals(pluginID)) {
			// do not produce content for other plug-ins
			return null;
		}

		if ((href != null) && (contentMap.containsKey(href))) {

			String helpPageContent = contentMap.get(href);
			try {
				return new ByteArrayInputStream(helpPageContent.toString()
						.getBytes("UTF-8"));
			} catch (UnsupportedEncodingException e) {
				GtErrorLogger.log(Activator.PLUGIN_ID, e);
			}

		}

		// if no content is registered return nothing
		return null;
	}

	/**
	 * Each command contribution can register own page content here which will
	 * be displayed when the given href is called.
	 * 
	 * @param href
	 * @param content
	 */
	public static void registerContent(String href, String content) {
		contentMap.put(href, content);
	}

}
