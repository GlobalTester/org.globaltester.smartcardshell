package org.globaltester.smartcardshell.protocols;

import java.util.Collection;
import java.util.List;

import org.eclipse.core.runtime.IExecutableExtension;

/**
 * Implementations of this interface provide functionality and description for
 * SCSH protocol extensions.
 * 
 * @author amay
 * 
 */
public interface IScshProtocolProvider extends IExecutableExtension{
	
	/**
	 * Lists all commands supported by this protocol. The names returned should
	 * not contain the protocol prefix and be valid parameters for the other
	 * methods defined within this interface.
	 * 
	 * @return all commands defined for this protocol
	 */
	public Collection<String> getCommands();

	/**
	 * Lists all parameters supported by the command indicated in parameter.
	 * 
	 * @param command
	 *            the command parameters should be returned for.
	 * 
	 *            This should be a String returned by getCommands() otherwise
	 *            null will be returned.
	 * @return A (possibly empty) list of supported parameters or null if the
	 *         command is not supported.
	 */
	public List<String> getParams(String command);

	/**
	 * Returns the ECMAScript code for the implementation of the command
	 * indicated by parameter command. This method essentially contains the
	 * heart of the protocol implementation, while most other methods support
	 * interactive usage.
	 * 
	 * The returned code will pasted in the prototype definition of the
	 * CardObject within SCSH script environment. Naming will be Card.gt_<protocol>_<command>
	 * 
	 * @param command
	 *            the command for which the implementation code should be
	 *            returned.
	 * 
	 *            This should be a String returned by getCommands() otherwise
	 *            null will be returned.
	 * @return ECMAScript code implementing the command
	 */
	public String getImplementation(String command);

	/**
	 * Generates a user friendly help text for the indicated command.
	 * 
	 * Neither parameters nor return value should not be described here but in
	 * the respective methods. The interactive output will be constructed from
	 * these methods similar to javadoc.
	 * 
	 * The returned String might use line breaks and spaces for indentation, but
	 * other whitespace should be avoided as indentation might get changed
	 * during presentation.
	 * 
	 * @param command
	 *            the command to generate help text for.
	 * 
	 *            This should be a String returned by getCommands() otherwise
	 *            null will be returned.
	 * @return help text for command
	 */
	public String getHelp(String command);

	/**
	 * Generates a user friendly help text for the indicated command.
	 * 
	 * The returned String might use line breaks and spaces for indentation, but
	 * other whitespace should be avoided as indentation might get changed
	 * during presentation.
	 * 
	 * @param command
	 *            the command to generate help text for.
	 * 
	 *            This should be a String returned by getCommands() otherwise
	 *            null will be returned.
	 * @return help text for return value
	 */
	public String getHelpReturn(String command);

	/**
	 * Generates a user friendly help text for the indicated command. This
	 * should include expected data type and default value for optional
	 * parameters.
	 * 
	 * The returned String might use line breaks and spaces for indentation, but
	 * other whitespace should be avoided as indentation might get changed
	 * during presentation.
	 * 
	 * @param command
	 *            the command to generate help text for.
	 * 
	 *            This should be a String returned by getCommands() otherwise
	 *            null will be returned.
	 * @param parameter
	 *            the parameter to generate help text for.
	 * 
	 *            This should be a String returned by getParams() otherwise null
	 *            will be returned.
	 * @return help text for parameter
	 */
	public String getHelpParam(String command, String parameter);

}
