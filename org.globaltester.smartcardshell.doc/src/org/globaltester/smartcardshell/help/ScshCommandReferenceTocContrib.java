package org.globaltester.smartcardshell.help;

import org.eclipse.help.IToc;
import org.eclipse.help.ITocContribution;
import org.globaltester.smartcardshell.doc.Activator;

public class ScshCommandReferenceTocContrib implements ITocContribution {

	private static ScshCommandReferenceTocContrib instance = null;

	@Override
	public String getCategoryId() {
		return "globaltesterSmartCardShellCommandRef";
	}

	@Override
	public String getContributorId() {
		return Activator.PLUGIN_ID;
	}

	@Override
	public String[] getExtraDocuments() {
		return new String[] {};
	}

	@Override
	public String getId() {
		return Activator.PLUGIN_ID + ".scshCommandReference";
	}

	@Override
	public String getLocale() {
		return null;
	}

	@Override
	public String getLinkTo() {
		return "/org.globaltester.base.doc/toc/user/toc.xml#reference";
	}

	@Override
	public IToc getToc() {
		return ScshCommandReferenceToc.getInstance();
	}

	@Override
	public boolean isPrimary() {
		return false;
	}

	public static synchronized ScshCommandReferenceTocContrib getInstance() {
		if (instance == null) {
			instance = new ScshCommandReferenceTocContrib();
		}
		return instance;
	}

}
