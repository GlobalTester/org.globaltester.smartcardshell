package org.globaltester.smartcardshell.ui.views;

import org.eclipse.swt.SWT;
import org.eclipse.swt.custom.StyledText;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Text;
import org.eclipse.ui.part.ViewPart;

public class SmartCardShellView extends ViewPart {
	public SmartCardShellView() {
	}

	public static final String ID = "org.globaltester.smartcardshell.ui.views.SmartCardShellView";
	private StyledText sTxtConsoleOut;
	private Text txtConsoleInput;
	
	
	public void createPartControl(Composite parent) {

		//use main composite to get rid of outer influence
		Composite mainComp = new Composite(parent,SWT.NONE);
		mainComp.setLayout(new GridLayout(1, false));
		
		sTxtConsoleOut = new StyledText(mainComp, SWT.READ_ONLY);
		sTxtConsoleOut.setEditable(false);
		sTxtConsoleOut.setLayoutData(new GridData(SWT.FILL, SWT.FILL, true, true, 1, 1));
		
		txtConsoleInput = new Text(mainComp, SWT.NONE);
		txtConsoleInput.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));
	}

	public void setFocus() {
	}
}
