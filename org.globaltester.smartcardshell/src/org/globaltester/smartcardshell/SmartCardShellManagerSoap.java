package org.globaltester.smartcardshell;

import javax.jws.WebMethod;
import javax.jws.WebService;
import javax.jws.soap.SOAPBinding;
import javax.jws.soap.SOAPBinding.Style;

import org.globaltester.control.AbstractRemoteControlHandler;
import org.globaltester.control.soap.JaxWsSoapAdapter;
import org.globaltester.logging.BasicLogger;
import org.globaltester.smartcardshell.ocf.PreferencesPropertyLoader;

@WebService
@SOAPBinding(style = Style.RPC)
public class SmartCardShellManagerSoap extends AbstractRemoteControlHandler implements JaxWsSoapAdapter {

	public SmartCardShellManagerSoap() {
	}
	
	@Override
	public String getIdentifier() {
		return "SmartCardShellManager";
	}

	@Override
	public <T> T getAdapter(Class<T> c) {
		if (c == JaxWsSoapAdapter.class) {
			return c.cast(this);
		}
		return null;
	}

    @WebMethod
    public void restartOCF() {
        try {
            PreferencesPropertyLoader.restartAndInitializeOCF();
        } catch (Exception e) {
            BasicLogger.logException(this.getClass(), e);
        }
    }
}
