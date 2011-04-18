package org.globaltester.smartcardshell;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.WrapFactory;

import de.cardcontact.scdp.gp.ByteString;

public class GTWrapFactory extends WrapFactory{

	@SuppressWarnings("rawtypes")
	public Object wrap(Context cx, Scriptable scope, Object obj, Class staticType) {

        if (obj instanceof byte[]) {
            return ByteString.newInstance(scope, (byte[])obj);
        }
        return super.wrap(cx, scope, obj, staticType);
    }	

}
