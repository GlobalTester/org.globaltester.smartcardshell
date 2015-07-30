package org.globaltester.smartcardshell.jsinterface;
import java.io.FileNotFoundException;
import java.io.PrintWriter;

// TODO: check file coding or not? UTF-8?
// TODO: Tags could be a set. more elegant
// TODO: Converter must deliver the result file
// TODO: Shall converter get a path parameter for where to put the result? (or use a class variable) 

public class JSFileWriter {

	/** opens stream for the output with file name {@link #outputJSFileName} */
	private PrintWriter writer = null;


	/** name of input XML file which was converted */
	private String inputXMLFileName = null;

	/** JavaScript file. Result of XML conversion */
	private String outputJSFileName = null;

	
	/**
     * initializes {@link #inputXMLFileName} with xmlFileName
     * and outputFileName with xmlFileName + ".js"
     * 
     * @param xmlFileName
     */
	public JSFileWriter(String xmlFileName) {
		inputXMLFileName = xmlFileName;
		setOutputFileName(xmlFileName + ".js"); //only for debugging
	}

	/**
	 * closes the output {@link #writer} and resets it to null.
	 */
	private void closeOutputFile() { 
		// TODO catch exception or leave this to calling methods?
		if (writer == null) {
			//TODO: warning?
			return;
		}
		try {
			writer.flush();
			writer.close();
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		writer = null;
	}

	/**
	 * creates a new {@link #writer} for file {@link #outputJSFileName}
	 * @throws FileNotFoundException if {@link #writer} could not be started
	 * @precondition {@link #outputJSFileName} != null
	 */
	private void openOutputFile() throws FileNotFoundException {
		assert (outputJSFileName != null);
		
		if (writer != null) {
			// stream is already open. TODO: should this method always open a
			// new stream or send an error message if outStr!=null??
			return;
		}
		
		//writer = new PrintWriter( outputFileName, "UTF-8"); //TODO: should we use UTF-8 here?
		writer = new PrintWriter( outputJSFileName);		
	}


	/**
	 * writes "line" to the output file {@link #outputJSFileName} without changes
	 * @param line
	 */
	private void writeJS2OutputFile(String text) {
		System.out.println(text);
		assert (writer != null);
		writer.print(text);
	}

	/**
	 * @return the outputFileName
	 */
	public String getOutputFileName() {
		return outputJSFileName;
	}

	/**
	 * @param outputFileName
	 *            the outputFileName to set
	 */
	public void setOutputFileName(String outputFileName) {
		// TODO any check wanted if outputFileName is null?
		this.outputJSFileName = outputFileName;
	}
	
	
	/**
	 * Opens file with name set in constructor, writes text into it and closes file
	 * 
	 * @param text
	 * @throws FileNotFoundException if file could not be opened
	 */
	public void writeOutput(String text) throws FileNotFoundException {
		openOutputFile();
		writeJS2OutputFile(text);
		closeOutputFile();		
	}
}
