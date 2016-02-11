package org.globaltester.smartcardshell.help;

import org.eclipse.help.AbstractTocProvider;
import org.eclipse.help.ITocContribution;

public class ScshCommandTocProvider extends AbstractTocProvider {

	public ScshCommandTocProvider() {
		//default constructor for reflective invocation
	}

	@Override
	public ITocContribution[] getTocContributions(String locale) {
		return new ITocContribution[]{ScshCommandReferenceTocContrib.getInstance()};
	}

}
