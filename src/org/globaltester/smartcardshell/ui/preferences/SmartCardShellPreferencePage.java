package org.globaltester.smartcardshell.ui.preferences;

import org.eclipse.core.runtime.preferences.InstanceScope;
import org.eclipse.jface.preference.BooleanFieldEditor;
import org.eclipse.jface.preference.FieldEditorPreferencePage;
import org.eclipse.jface.preference.IPreferenceStore;
import org.eclipse.jface.preference.RadioGroupFieldEditor;
import org.eclipse.jface.preference.StringFieldEditor;
import org.eclipse.swt.SWT;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Group;
import org.eclipse.ui.IWorkbench;
import org.eclipse.ui.IWorkbenchPreferencePage;
import org.eclipse.ui.preferences.ScopedPreferenceStore;
import org.globaltester.smartcardshell.Activator;
import org.globaltester.smartcardshell.preferences.PreferenceConstants;

public class SmartCardShellPreferencePage extends FieldEditorPreferencePage
		implements IWorkbenchPreferencePage {

	private Group grpOcfProperties;
	private RadioGroupFieldEditor rgfeConfigSource;
	private StringFieldEditor sfeScshConfigPath;
	private StringFieldEditor sfeOpenCardServices;
	private StringFieldEditor sfeOpenCardTerminals;

	private Group grpReaderSelection;
	private BooleanFieldEditor bfeManualReaderSettings;
	private OcfReaderSelectionFieldEditor orsfeReaderSelection;

	private Group grpEcmaScriptProperties;

	public SmartCardShellPreferencePage() {
		super(FieldEditorPreferencePage.GRID);
		IPreferenceStore store = new ScopedPreferenceStore(new InstanceScope(),
				Activator.PLUGIN_ID);
		setPreferenceStore(store);
		setDescription("Preferences for OpenCardFramework and SmartCardShell.");
	}

	@Override
	protected void createFieldEditors() {
		// get common values
		Composite parent = getFieldEditorParent();
		int columns = ((GridLayout) parent.getLayout()).numColumns + 1;

		// create group for OCF properties
		grpOcfProperties = new Group(parent, SWT.NONE);
		grpOcfProperties.setText("OpenCardFramework");
		GridData gdGrpOcfProperties = new GridData(GridData.FILL,
				GridData.FILL, true, false);

		// create fieldEditors for OCF properties
		String[][] configOptions = {
				{ "opencard.properties",
						PreferenceConstants.OCF_CONFIGURATION_SOURCE_default },
				{ "Configuration file",
						PreferenceConstants.OCF_CONFIGURATION_SOURCE_file },
				{
						"Eclipse preferences",
						PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences } };
		rgfeConfigSource = new RadioGroupFieldEditor(
				PreferenceConstants.OCF_CONFIGURATION_SOURCE,
				"Configuration source\n", 1, configOptions, grpOcfProperties);
		addField(rgfeConfigSource);

		gdGrpOcfProperties.horizontalSpan = columns;
		grpOcfProperties.setLayoutData(gdGrpOcfProperties);
		grpOcfProperties.setLayout(new GridLayout(columns, false));

		sfeScshConfigPath = new StringFieldEditor(
				PreferenceConstants.OCF_PROPERTIES_FILE, "scshConfig path",
				grpOcfProperties);
		addField(sfeScshConfigPath);

		sfeOpenCardServices = new StringFieldEditor(
				PreferenceConstants.OCF_OPENCARD_SERVICES, "OpenCard.Services",
				grpOcfProperties);
		addField(sfeOpenCardServices);

		sfeOpenCardTerminals = new StringFieldEditor(
				PreferenceConstants.OCF_OPENCARD_TERMINALS,
				"OpenCard.Terminals", grpOcfProperties);
		addField(sfeOpenCardTerminals);

		// create group for reader selection
		grpReaderSelection = new Group(getFieldEditorParent(), SWT.NONE);
		grpReaderSelection.setText("Card reader");
		GridData gdGrpReaderSelection = new GridData(GridData.FILL,
				GridData.FILL, true, false);
		gdGrpReaderSelection.horizontalSpan = 2;
		grpReaderSelection.setLayoutData(gdGrpReaderSelection);
		grpReaderSelection.setLayout(new GridLayout(2, false));

		// manual settings of terminals
		bfeManualReaderSettings = new BooleanFieldEditor(
				PreferenceConstants.OCF_MANUAL_READERSELECT,
				"Manual setting of card terminal", grpReaderSelection);
		addField(bfeManualReaderSettings);

		orsfeReaderSelection = new OcfReaderSelectionFieldEditor(
				PreferenceConstants.OCF_READER, "Reader selection", 1,
				grpReaderSelection);
		addField(orsfeReaderSelection);

		// create group for ECMA
		grpEcmaScriptProperties = new Group(parent, SWT.NONE);
		grpEcmaScriptProperties.setText("ECMAScript environment");

	}

	public void init(IWorkbench workbench) {

	}

}