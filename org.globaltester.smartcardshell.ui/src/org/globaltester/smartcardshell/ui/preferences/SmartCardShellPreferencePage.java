package org.globaltester.smartcardshell.ui.preferences;

import org.eclipse.core.runtime.preferences.InstanceScope;
import org.eclipse.jface.preference.BooleanFieldEditor;
import org.eclipse.jface.preference.FieldEditorPreferencePage;
import org.eclipse.jface.preference.FileFieldEditor;
import org.eclipse.jface.preference.IPreferenceStore;
import org.eclipse.jface.preference.PreferencePage;
import org.eclipse.jface.preference.RadioGroupFieldEditor;
import org.eclipse.jface.preference.StringFieldEditor;
import org.eclipse.jface.util.PropertyChangeEvent;
import org.eclipse.swt.SWT;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Group;
import org.eclipse.ui.IWorkbench;
import org.eclipse.ui.IWorkbenchPreferencePage;
import org.eclipse.ui.preferences.ScopedPreferenceStore;
import org.globaltester.core.ui.preferences.PropertyFieldEditor;
import org.globaltester.smartcardshell.Activator;
import org.globaltester.smartcardshell.preferences.PreferenceConstants;

public class SmartCardShellPreferencePage extends FieldEditorPreferencePage
		implements IWorkbenchPreferencePage {

	private static final String OCF_WARNING = "Changes of OCF Framework parameters will require a restart of SmartCardService to take effect. This might interrupt running SmartCardShells. ";
	private Group grpOcfProperties;
	private RadioGroupFieldEditor rgfeConfigSource;
	private StringFieldEditor sfeScshConfigPath;
	private PropertyFieldEditor pfeOpenCardServices;
	private PropertyFieldEditor pfeOpenCardTerminals;

	private Group grpReaderSelection;
	private BooleanFieldEditor bfeManualReaderSettings;
	private OcfReaderSelectionFieldEditor orsfeReaderSelection;
	private boolean configSourceFile;
	private boolean configSourcePreferences;
	private boolean manualReaderSelectEnabled;

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
		columns = 3;

		// create group for OCF properties
		grpOcfProperties = new Group(parent, SWT.NONE);
		grpOcfProperties.setText("OpenCardFramework");
		GridData gdGrpOcfProperties = new GridData(GridData.FILL,
				GridData.FILL, true, false);

		// create fieldEditors for OCF properties
		String[][] configOptions = {
				{ "Default opencard.properties",
						PreferenceConstants.OCF_CONFIGURATION_SOURCE_default },
				{ "User specified opencard.properties",
						PreferenceConstants.OCF_CONFIGURATION_SOURCE_file },
				{ "Eclipse preferences",
						PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences } };
		rgfeConfigSource = new RadioGroupFieldEditor(
				PreferenceConstants.OCF_CONFIGURATION_SOURCE,
				"Configuration source\n", 1, configOptions, grpOcfProperties);
		addField(rgfeConfigSource);

		gdGrpOcfProperties.horizontalSpan = columns;
		grpOcfProperties.setLayoutData(gdGrpOcfProperties);
		grpOcfProperties.setLayout(new GridLayout(columns, false));

		sfeScshConfigPath = new FileFieldEditor(
				PreferenceConstants.OCF_PROPERTIES_FILE, "OpenCard.properties",
				grpOcfProperties);
		addField(sfeScshConfigPath);

		pfeOpenCardServices = new PropertyFieldEditor(
				PreferenceConstants.OCF_OPENCARD_SERVICES, "OpenCard.Services",
				grpOcfProperties);
		addField(pfeOpenCardServices);

		pfeOpenCardTerminals = new PropertyFieldEditor(
				PreferenceConstants.OCF_OPENCARD_TERMINALS,
				"OpenCard.Terminals", grpOcfProperties);
		addField(pfeOpenCardTerminals);

		// create group for reader selection
		grpReaderSelection = new Group(getFieldEditorParent(), SWT.NONE);
		grpReaderSelection.setText("Card reader");
		GridData gdGrpReaderSelection = new GridData(GridData.FILL,
				GridData.FILL, true, true);
		gdGrpReaderSelection.horizontalSpan = 3;
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
		
		updateFieldEditorEnabledStates();

	}

	public void init(IWorkbench workbench) {
		IPreferenceStore pStore = Activator.getDefault().getPreferenceStore();
		
		String ocfConfigSource = pStore
		.getString(PreferenceConstants.OCF_CONFIGURATION_SOURCE);
		configSourceFile = PreferenceConstants.OCF_CONFIGURATION_SOURCE_file.equals(ocfConfigSource);
		configSourcePreferences = PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences.equals(ocfConfigSource);
		
		manualReaderSelectEnabled = pStore.getBoolean(PreferenceConstants.OCF_MANUAL_READERSELECT);
	}

	@Override
	public void propertyChange(PropertyChangeEvent event) {

		//track selected options for Configsource and manual reader selection
		if (rgfeConfigSource.equals(event.getSource())){
			String newValue = (String) event.getNewValue();
			configSourceFile = PreferenceConstants.OCF_CONFIGURATION_SOURCE_file.equals(newValue);
			configSourcePreferences = PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences.equals(newValue);
		}
		if (bfeManualReaderSettings.equals(event.getSource())){
			manualReaderSelectEnabled = (Boolean) event.getNewValue();
		}
		
		// add warning to this dialog if one of the OCF properties changes
		if ((rgfeConfigSource.equals(event.getSource()))
				|| (sfeScshConfigPath.equals(event.getSource()))
				|| (pfeOpenCardServices.equals(event.getSource()))
				|| (pfeOpenCardTerminals.equals(event.getSource()))) {
			this.setOcfWarning(true);
		}
		
		updateFieldEditorEnabledStates();
		
		super.propertyChange(event);
	}

	private void updateFieldEditorEnabledStates() {
		//enable/disable required FieldEditors
		sfeScshConfigPath.setEnabled(configSourceFile, grpOcfProperties);
		pfeOpenCardServices.setEnabled(configSourcePreferences, grpOcfProperties);
		pfeOpenCardTerminals.setEnabled(configSourcePreferences, grpOcfProperties);
		orsfeReaderSelection.setEnabled(manualReaderSelectEnabled, grpReaderSelection);
	}

	private void setOcfWarning(boolean ocfMessage) {
		if (ocfMessage) {
			this.setMessage(OCF_WARNING, PreferencePage.WARNING);
		} else {
			this.setMessage("");
		}
		orsfeReaderSelection.setRefreshEnabled(!ocfMessage);		
	}

	@Override
	protected void performDefaults() {
		super.performDefaults();
		this.setOcfWarning(true);
		
		IPreferenceStore pStore = Activator.getDefault().getPreferenceStore();
		String ocfConfigSource = pStore
		.getDefaultString(PreferenceConstants.OCF_CONFIGURATION_SOURCE);
		configSourceFile = PreferenceConstants.OCF_CONFIGURATION_SOURCE_file.equals(ocfConfigSource);
		configSourcePreferences = PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences.equals(ocfConfigSource);
		
		manualReaderSelectEnabled = pStore.getDefaultBoolean(PreferenceConstants.OCF_MANUAL_READERSELECT);
		
		updateFieldEditorEnabledStates();
	}

	@Override
	protected void performApply() {
		super.performApply();
		this.setOcfWarning(false);
		
		IPreferenceStore pStore = Activator.getDefault().getPreferenceStore();
		String ocfConfigSource = pStore
		.getString(PreferenceConstants.OCF_CONFIGURATION_SOURCE);
		configSourceFile = PreferenceConstants.OCF_CONFIGURATION_SOURCE_file.equals(ocfConfigSource);
		configSourcePreferences = PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences.equals(ocfConfigSource);
		
		manualReaderSelectEnabled = pStore.getBoolean(PreferenceConstants.OCF_MANUAL_READERSELECT);
		
		updateFieldEditorEnabledStates();
	}

}