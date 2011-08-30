package org.globaltester.smartcardshell.gp;

/* 
 * Project 	GlobalTester-Plugin 
 * File		AssertionError.java
 *
 * Date    	27.06.2006
 * 
 * 
 * Developed by HJP Consulting GmbH
 * Lanfert 24
 * 33106 Paderborn
 * Germany
 * 
 * 
 * This software is the confidential and proprietary information
 * of HJP ("Confidential Information"). You shall not disclose such
 * Confidential Information and shall use it only in accordance 
 * with the terms of the Non-Disclosure Agreement you entered 
 * into with HJP.
 * 
 */

import org.mozilla.javascript.Context;
import org.mozilla.javascript.ScriptableObject;

import de.cardcontact.scdp.gp.GPError;

/**
 * This class is used instead of GPError to transfer received and expected 
 * values to Testcase. Here it can be used to extend the test report.
 * 
 * @version		Release 2.2.0
 * @author 		Holger Funke
 *
 */


public class AssertionError extends ScriptableObject {	

	private static final long serialVersionUID = -7959222873668547415L;


/**
     * Empty constructor calling super()
     *
     */
    public AssertionError() {
        super();
    }

	
	/**
	 * Use this Assertion to protocol the parameters in log file.
	 *  
	 * @param className			Class name of calling class
	 * @param error				Error ID
	 * @param reason			Error reason
	 * @param message			Error text
	 * @param expectedValue		expected value
	 * @param receivedValue		received value
	 */
	public AssertionError(String className, int error, int reason, String message, String expectedValue, String receivedValue) {
        put("className", this, className);
        put("error", this, new Integer(error));
        put("reason", this, new Integer(reason));
        put("message", this, message);
        put("name", this, "AssertionError");
        put("expectedValue", this, expectedValue);
        put("receivedValue", this, receivedValue);
	}
	
	/**
     * Return object content as string
     * @return String
     */
    public String jsFunction_toString() {
        return toString();
    }
    
    
    
    /**
     * Return object content as string
     * @return String
     */
    public String toString() {

        String errtxt;
        String className = Context.toString(get("className", this));
        int error = (int)Context.toNumber(get("error", this));
        int reason = (int)Context.toNumber(get("reason", this));
        String message = Context.toString(get("message", this));
        
        if ((error >= 1) && (error <= GPError.LAST_ERROR))
            errtxt = GPError.ErrorName[error - 1];
        else
            errtxt = "" + error;
        
        return className + " (" + errtxt + "/" + reason + ") - " + message;
    }
    
	
	/**
	 * Return class name of AssertionError
	 * return string "AssertionError"
	 */
	public String getClassName() {
		return "AssertionError";
	}
	


}
