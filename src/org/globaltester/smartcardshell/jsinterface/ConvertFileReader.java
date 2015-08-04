/**
 * 
 */
package org.globaltester.smartcardshell.jsinterface;

//import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;



//import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;

/**
 * 
 * The JavaScript code to be debugged in GT is not given in a ready to use
 * JavaScript file, but in an XML file. Special GT tags such as
 * &lt;TechnicalCommand&gt; and &lt;TechnicalResult&gt; bracket this code and
 * can be used to detect the appropriate areas. <BR>
 * <BR>
 * RhinoDebugger offers the method Context.evaluateReader(Scriptable scope, Reader
 * in, String sourceName, int lineno, Object securityDomain) to read and
 * evaluate a given JavaScript file. The given XML code in the GT test cases
 * is filtered in a way that only the relevant JavaScript code is evaluated
 * by this method. <BR>
 * <BR>
 * <BR>
 * Therefore an analyzer was required for detecting the JavaScript code. Parts in
 * the XML file which are not JavaScript shall be replaced by whitespaces. This
 * shall be done in a way that the structure of the original file can be
 * maintained concerning number of characters, line numbers, tabs etc. This
 * filtered JavaScript code shall be passed to the evaluating method (see
 * above). The reader given here replaces every non-whitespace character with a
 * blank but leaves JavaScript code inside the declared tags untouched. More
 * tags can be added in method {@link #initTagTuple()}. <BR>
 * <BR>
 * What should be considered: The XML file must have a correct syntax, but may
 * be formatted in any allowed way e.g. JavaScript code can be in the same line
 * as non-JavaScript code. In the filtered code line numbers and the number of
 * signs of the XML file must be maintained so that errors can more easily be
 * retrieved (positions between original file and filtered code must still be
 * mappable).<BR><BR>
 * 
 * FIXME Some functionality is still missing:<BR>
 * - some additional methods of class Reader should be added to ensure the 
 * interface is complete:
 * more read methods, skip, reset (anything else?)<BR>
 * - cdata areas inside JavaScript code: there may currently be only one cdata 
 * area per "Technical Command/Result ..." block, which brackets 
 * the whole JS code there<BR>
 * - JS code may not contain special XML characters such as "& lt ;" for "<"; 
 * cdata areas can be used instead<BR>
 * - if one of the GT XML tags (TechnicalCommand etc.) is accidentally
 * positioned inside an XML or JavaScript string value, this is not
 * recognized. This is probably no problem since '<''>' must be masked
 * inside attribute values in XML code. Inside JavaScript such values should
 * be bracketed by a cdata region and should thus also be no problem.
 * 
 * @author koelzer
 *
 */
public class ConvertFileReader extends FileReader {

	/**
	 * Simple tuple class which holds the tuples with indexes for the XML tag
	 * search. {@link #startPos} is the index in the file where an area e.g.
	 * JavaScript code starts. {@link #endPos} is the index in the file where an
	 * area e.g. JavaScript code ends.
	 */
	public class IndexTuple { 
		public int startPos;
		public int endPos;

		/**
		 * @param startPos
		 *            index of the first sign in JavaScript code
		 * @param endPos
		 *            index of the last sign in JavaScript code
		 */
		public IndexTuple(int startPos, int endPos) {
			this.startPos = startPos;
			this.endPos = endPos;
		}
		
		public void println() {
			System.out.println("Start pos.: " + startPos + "; End pos.: " + endPos);
		}

	}

	public class TupleComparator implements Comparator<IndexTuple> {

		/*
		 * @see java.util.Comparator#compare(java.lang.Object, java.lang.Object)
		 */
		@Override
		public int compare(IndexTuple o1, IndexTuple o2) {
			return o1.startPos < o2.startPos ? -1 : o1.startPos == o2.startPos ? 0 : 1;
		}
	}

	/**
	 * Used to hold pairs of tag strings (start and end) such as 
	 * &ltTechnicalCommand&gt", "&lt/TechnicalCommand&gt" 
	 * see {@link #initTagTuple()}.
	 */
	public class TagTuple {
		public String startTag;
		public String endTag;
		
		public TagTuple(String startTag, String endTag) {
			this.startTag = startTag;
			this.endTag = endTag;
		}
	}

	/**
	 * Absolute index where we last found the start of an XML area
	 */
	int absCurStartPosXML = 0;

	/**
	 * a copy of the whole content of the file
	 * read; this is used to locate the
	 * positions of beginning and end of JavaScript 
	 */
	protected String fileBuffer = ""; 

	/**
	 * the result of code conversion;
	 * currently only used for debugging
	 */
	protected String convertedCode = "";

	/**
	 * name of the file in use (currently only used for debugging)
	 */
	protected String fileName; 

	/**
	 * indicates on which position in the file the
	 * read operation currently operates. This is
	 * used to be able to map positions between the
	 * string in curBuffer and the buffer which is
	 * written in read()
	 */
	protected int fileCursor = 0;

	/**
	 * stores tuples which hold the start and end position of JavaScript code
	 */
	protected ArrayList<IndexTuple> indexArray = new ArrayList<IndexTuple>(); 

	/**
	 * stores tuples which hold the start and end XML tag names
	 * which bracket JavaScript code
	 */
	protected ArrayList<TagTuple> tagArray = new ArrayList<TagTuple>();

	/**
	 * File length (number of characters in file)
	 */
	protected int fileLength; 
	
	
    /**
     * Writes text character wise one per line with a preceding line number;
     * currently only used for debugging 
     * @param fileName file to write to
     * @param text to write
     */
    protected void printFileOneCharPerLine(String fileName, String text) {
		try {
			PrintWriter writer = new PrintWriter(fileName);		
			for (int i = 0; i < text.length(); i++) {
				writer.println("[" + i + "] " + text.charAt(i));
			}
			writer.flush();
			writer.close();
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
    	
    }
	/**
	 * Prints index array to system out
	 * @param indexArray2
	 */
	protected void printIndexArray(ArrayList<IndexTuple> indexArray2) {
		System.out.println("Index array:");
		for (IndexTuple indexTuple : indexArray) {
			indexTuple.println();
		}
	}

	/**
	 * Initializes file reader calling the super constructor. Afterwards the
	 * content of the file given by fileName is stored in {@link #fileBuffer}. 
	 * The indexes for JavaScript start and end positions are stored 
	 * in an index array.
	 * 
	 * @param fileName
	 * @throws FileNotFoundException, IOException, Exception are only transferred from called methods
	 * 
	 */
	public ConvertFileReader(String fileName) throws FileNotFoundException,
			IOException, Exception {

		super(fileName);
		this.fileName = fileName;
		initTagTuple(); //adds the currently relevant tags which should be considered
		readFileIntoBuffer(fileName);
		printFileOneCharPerLine(new String(fileName + "-1perLn.txt"), fileBuffer);
		findTagIndexes();
	}

	/**
	 * This method initializes the {@link #tagArray} by adding tag start name
	 * and end name pairs to it.
	 */
	protected void initTagTuple() {
		tagArray.add(new TagTuple("<TechnicalCommand>", "</TechnicalCommand>"));
		tagArray.add(new TagTuple("<TechnicalResult>", "</TechnicalResult>"));
	}

	/**
	 * Reads the XML file given by fileName into the local member
	 * {@link #fileBuffer}. This is necessary because we need the context around
	 * the JavaScript code to decide where it ends.
	 * 
	 * @param fileName
	 *            XML file to be converted
	 * @throws IOException
	 */
	// TODO this variant is used in the test environment, since it has different
	// libraries installed. Delete this in later versions!
	//	protected void readFileIntoBuffer(String fileName) throws IOException {
//		File inFile = new File(fileName);
////		curBuffer = FileUtils.read(inFile); // TODO: check character set?
//		fileBuffer = FileUtils.readFileToString(inFile); // TODO: check character set?
//		// System.out.println(curBuffer);
//		fileLength = fileBuffer.length();
//	}

	protected void readFileIntoBuffer(String fileName) throws IOException {
		FileInputStream inFile = new FileInputStream(fileName);
		fileBuffer = IOUtils.toString(inFile); // TODO: check character set?
		//System.out.println(fileBuffer);
	}


	/**
	 * calculates index pairs inside the currently read buffer with start and
	 * end index of XML areas to be replaced
	 * 
	 * @param xmlIndexArray
	 *            stores the pairs found
	 * @param curFileCursor
	 *            absolute position in the original file of the first character
	 *            of the currently read buffer
	 * @param endIndex
	 *            absolute position in the original file of the last character
	 *            of the currently read buffer
	 * @param off
	 *            offset where the reader starts reading the current buffer
	 */
	protected void getXMLStartEndIndexesForCurrentBuffer(
			ArrayList<IndexTuple> xmlIndexArray, int curFileCursor,
			int endIndex, int off) {
		int relativeStartPosXML, relativeEndPosXML;
		IndexTuple indexTuple;
		int relativeOffset = curFileCursor - off; // constant to be subtracted 
			// from the absolute index to get the relative index
		
		int lastJSIndex;
		
		if (indexArray.size() == 0) // no JS code found
			lastJSIndex = -1;
		else
			lastJSIndex = (indexArray.get(indexArray.size()-1)).endPos;
		
		if (curFileCursor > lastJSIndex) { // the current block only contains XML
			relativeStartPosXML = curFileCursor - relativeOffset;
			relativeEndPosXML = endIndex - relativeOffset;
			xmlIndexArray.add(new IndexTuple(relativeStartPosXML,
					relativeEndPosXML));
			System.out.println("relativeStartPosXML "
					+ relativeStartPosXML + ", relativeEndPosXML "
					+ relativeEndPosXML);
			System.out.println("abs. StartPosXML "
					+ curFileCursor + ", abs. EndPosXML "
					+ endIndex);
			absCurStartPosXML = endIndex; // replace till end of block
			System.out.println("absCurStartPosXML " + absCurStartPosXML);
			return;
		}

		for (int i=0; i<indexArray.size(); i++) {

			indexTuple = indexArray.get(i);
			// check if there is a JavaScript area starting in this part of the buffer
			// with XML in front of it, which must be replaced
			if ((indexTuple.startPos >= curFileCursor)
					&& (indexTuple.startPos <= endIndex)) {
				
				relativeStartPosXML = absCurStartPosXML - relativeOffset;
				relativeEndPosXML = indexTuple.startPos - relativeOffset;

				xmlIndexArray.add(new IndexTuple(relativeStartPosXML, relativeEndPosXML));
				System.out.println("relativeStartPosXML " + relativeStartPosXML + ", relativeEndPosXML " + relativeEndPosXML);
				System.out.println("abs. StartPosXML "
						+ absCurStartPosXML + ", abs. EndPosXML "
						+ indexTuple.startPos);
				absCurStartPosXML = indexTuple.endPos; // one behind the JS code
			}
			
			// check if this part of the buffer is totally XML, which must be replaced
			else if ((absCurStartPosXML <= curFileCursor) && (indexTuple.startPos >= endIndex)) {
				relativeStartPosXML = off; // start on first field
				relativeEndPosXML = endIndex - relativeOffset;
				xmlIndexArray.add(new IndexTuple(relativeStartPosXML, relativeEndPosXML));
				System.out.println("relativeStartPosXML " + relativeStartPosXML + ", relativeEndPosXML " + relativeEndPosXML);
				System.out.println("abs. StartPosXML "
						+ curFileCursor + ", abs. EndPosXML "
						+ endIndex);
				absCurStartPosXML = endIndex; // first field of next buffer
			}
			
			// check if there is XML code behind the last JS code block in this
			// buffer
			if ((indexTuple.endPos >= curFileCursor) && (indexTuple.endPos < endIndex)) {
				relativeStartPosXML = indexTuple.endPos - relativeOffset;
				if (i+1 < indexArray.size()) { // we need the start position of
												// the next JS block
					IndexTuple nextTuple = indexArray.get(i + 1);
					if (nextTuple.startPos > endIndex) { // next JS block is in
															// next buffer
						relativeEndPosXML = endIndex - relativeOffset;
						xmlIndexArray.add(new IndexTuple(relativeStartPosXML,
								relativeEndPosXML));
						System.out.println("relativeStartPosXML "
								+ relativeStartPosXML + ", relativeEndPosXML "
								+ relativeEndPosXML);
						System.out.println("abs. StartPosXML "
								+ indexTuple.endPos + ", abs. EndPosXML "
								+ endIndex);
						absCurStartPosXML = endIndex; // first field of next
															// buffer
					}
					// else nothing to do; take next tuple
				} else { // this is the last JS block in the file; replace till
							// the end
					relativeEndPosXML = endIndex - relativeOffset;
					xmlIndexArray.add(new IndexTuple(relativeStartPosXML,
							relativeEndPosXML));
					System.out.println("relativeStartPosXML "
							+ relativeStartPosXML + ", relativeEndPosXML "
							+ relativeEndPosXML);
					System.out.println("abs. StartPosXML "
							+ indexTuple.endPos + ", abs. EndPosXML "
							+ endIndex);
					absCurStartPosXML = endIndex; // replace till end of block
				}
			}

			System.out.println("absCurStartPosXML " + absCurStartPosXML);
			
			// we can stop if last endPos checked is behind the end of the
			// current buffer
			if (indexTuple.endPos > endIndex)
				break;
		}
	}
	
	
	
	/** 
	 * This method of InputStreamReader is overridden for the following reason:
	 * evaluateReader of the Mozilla-RhinoDebugger interface calls
	 * FileReader:read(char[] cbuf, int off, int len) (in blocks of 512 fields
	 * length in the current implementation). Since GlobalTester does not use
	 * pure JavaScript files for the test cases, but XML files containing
	 * JavaScript between special tags, we need a way to filter the XML files to
	 * be able to send the JS code to the debugger, but ignore the rest of XML
	 * code. This read method replaces every character in the XML file by a
	 * blank (' ') except whitespaces and except the JS code bracketed by the tags given in {@link #tagArray}. Since the
	 * read method is called by evaluateReader in blocks of 512 fields, the
	 * content of the read file is stored in {@link #currentBuf} so that we are
	 * able to consider the context of what is currently read (the end tag of
	 * JavaScript code could be in the next block for example).
	 * This means the destination buffer cbuf contains the result of this filtering
	 * on return.
	 *  
	 * @see java.io.InputStreamReader#read(char[], int, int)
	 */ 
	/*
	 * TODO: if one of the GT XML tags (TechnicalCommand etc.) is accidentally
	 * positioned inside an XML or JavaScript string value, this is not
	 * recognized. This is probably no problem since '<''>' must be masked
	 * inside attribute values in XML code. Inside JavaScript such values should
	 * be bracketed by a cdata region and thus also should be no problem.
	 */
	@Override
	public int read(char[] cbuf, int off, int len) throws IOException {

		System.out.println("Offset: " + off + ", Length: " + len);
		Integer readChars = super.read(cbuf, off, len); // fill buffer using the
														// read method of super
														// class

		if (readChars == -1) // end of file reached
			return readChars;
		
		int endIndex = fileCursor + readChars; // last absolute position read in the
												// current file

		ArrayList<IndexTuple> xmlIndexArray = new ArrayList<IndexTuple>(); 

		getXMLStartEndIndexesForCurrentBuffer(xmlIndexArray, fileCursor, endIndex, off);
		printIndexArray(xmlIndexArray);

		for (IndexTuple indexTuple : xmlIndexArray) {
			replaceCharacters(cbuf, indexTuple.startPos, indexTuple.endPos);
		}

		// Copy result into convertedCode. This is used to check the result; currently only for debugging
		char [] relevantBuf = new char[readChars];
		for (int i=0;i<readChars;i++) { //copy only relevant part of the buffer cbuf (it can contain obsolete characters)
			relevantBuf[i] = cbuf[i+off];
		}
		
		convertedCode += new String(relevantBuf);

//		System.out.println("Converted buffer:");
//		System.out.println(relevantBuf);
//		System.out.println("End converted buffer:");
//
//		System.out.println("Return read characters: " + readChars);

		fileCursor += readChars; // move the cursor further adding the number of
									// characters read

		// TODO JS file is currently written at the end;
		// we should better write every part, since exceptions from
		// Context.evaluateReader() can cause that this point is never
		// reached
		if (fileCursor >= fileLength ) {// finished. file is completely
												// read
			try {
				JSFileWriter outputWriter = new JSFileWriter(fileName);
				outputWriter.writeOutput(convertedCode);
			} catch (Exception exc) {
				System.out.println("An error occurred acsessing file " + 
						fileName + " for writing the converted JavaScript " + 
						"code in ConvertFileReader.");
			}
		}

		return readChars;
	}

	/**
	 * Replaces every non-whitespace character in cbuf between field 
	 * curStartPosXML and curEndPosXML by a blank
	 * 
	 * @param cbuf
	 * @param curStartPosXML
	 * @param curEndPosXML
	 */
	protected void replaceCharacters(char[] cbuf, int curStartPosXML, int curEndPosXML) {
		System.out.println("curStartPosXML " + curStartPosXML + " curEndPosXML " + curEndPosXML);
		for (int i = curStartPosXML; i < curEndPosXML; i++) {
			// replace characters left to startPos
			if (!Character.isWhitespace(cbuf[i]))
				cbuf[i] = ' '; // whitespaces are not replaced
		}		
	}

/* TODO
	@Override
	public int read() throws IOException {
		// TODO this must check the input, too, according to read(buffer ...)
		Integer inchar = super.read();
		return inchar;
	}
*/
	
	/**
	 * Analyzes the content of {@link #fileBuffer} in order to find the start
	 * and end indexes of JavaScript code. The result is stored in
	 * {@link #indexArray}.
	 * 
	 * @throws Exception
	 *             in case a syntax error occurred (end tag missing)
	 */
	// TODO should there be an exception of none of our tags is found?
	public void findTagIndexes() throws Exception { // TODO which exception
													// class ? new one?

		boolean found = true;
		int fromIndex, startPos, endPos, pos, pos2;

		// walk through all relevant tag pairs and store their positions
		for (TagTuple tagTuple : tagArray) {
			found = true;
			//TODO check content of tagTuple.startTag and tagTuple.endTag, e.g. !="" ??
			fromIndex = 0;
			System.out.println("Tag tuple: " + tagTuple.startTag + ", " + tagTuple.endTag);

			while (found) {
				found = false;
				if ((pos = fileBuffer.indexOf(tagTuple.startTag, fromIndex)) != -1) {
					startPos = pos + tagTuple.startTag.length();
					// System.out.println("startPos: " + startPos);
					if ((pos2 = fileBuffer.indexOf(tagTuple.endTag, startPos)) != -1) {
						endPos = pos2 - 1; // position of last character before
											// the
											// string found
						fromIndex = endPos + tagTuple.endTag.length() + 1;
						// System.out.println("endPos: " + endPos);
						// System.out.println("fromIndex: " + fromIndex);
						found = true;
						IndexTuple tuple = new IndexTuple(startPos, endPos);
						changeIndexesForCDataArea(tuple);
						indexArray.add(tuple);
					} else {
						// something wrong - no end tag found
						// throw exception? TODO
						// System.out.println("fromIndex: " + fromIndex);
						throw new Exception("Syntax error in file " + fileName
								+ "occured! End tag not found!");
					}
				}
			}
		}
		printIndexArray(indexArray);
		Collections.sort(indexArray, new TupleComparator());
//		indexArray.sort(new TupleComparator());
		printIndexArray(indexArray);
	}
	
	/**
	 * Searches for a CDATA area in the JavaScript code since 
	 * this needs a special treatment.<BR>
	 * NOTE: There may currently only be ONE CDATA-area in one Technical 
	 * Result/Command block!!<BR>
	 * @param tuple contains indexes of start and end position in curBuffer 
	 * 		where the search should take place. These indexes are moved so that
	 * 		the cdata start and end strings are deleted together with
	 * 		the surrounding XML code.  
	 */
	public void changeIndexesForCDataArea(IndexTuple tuple) {
		int startPos, endPos;
		String cDataStart = "<![CDATA[";
		String cDataEnd = "]]>";

		if (((startPos = fileBuffer.indexOf(cDataStart, tuple.startPos)) != -1)
				&& (startPos <= tuple.endPos)) {
			System.out.println("cdata found at position: " + startPos);
			tuple.startPos = startPos + cDataStart.length();
			
			if (((endPos = fileBuffer.indexOf(cDataEnd, startPos)) != -1)
					&& (endPos <= tuple.endPos)) {
				System.out.println("cdata found at position: " + endPos);
				tuple.endPos = endPos - 1; // last field before end tag
			}
		}
		// else nothing to do
	}	
}
