package org.globaltester.smartcardshell.cms;

import java.lang.reflect.Field;
import java.util.Enumeration;

import org.bouncycastle.asn1.ASN1Sequence;
import org.bouncycastle.asn1.ASN1Set;
import org.bouncycastle.asn1.DEREncodable;
import org.bouncycastle.asn1.DERObjectIdentifier;
import org.bouncycastle.asn1.cms.SignedData;
import org.bouncycastle.cms.CMSException;
import org.bouncycastle.cms.CMSSignedData;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.FunctionObject;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import de.cardcontact.scdp.cms.JsCMSSignedData;
import de.cardcontact.scdp.gp.ByteString;
import de.cardcontact.tlv.ObjectIdentifier;
import de.cardcontact.tlv.ParseBuffer;
import de.cardcontact.tlv.PrimitiveTLV;

/**
 * Extends JsCMSSignedData in order to allow operation with a broader range of
 * BouncyCastle versions (even w/o the original CC modification)
 * 
 * @author amay
 *
 */
public class JsCmsSignedData extends JsCMSSignedData {

	private CmsSignedDataExt signedDataExt;
	
    public static class CmsSignedDataExt extends CMSSignedData {

		public CmsSignedDataExt(byte[] bytes) throws CMSException {
			super(bytes);
		}

		public SignedData getSignedData() {
			Field f;
			try {
				f = CMSSignedData.class.getDeclaredField("signedData");
				f.setAccessible(true);
				return (SignedData) f.get(this);
			} catch (Exception e) {
				throw new RuntimeException(e);
			}
		}

	}

	private static final long serialVersionUID = 1L;
    static final int SID_ISSUERANDSERIALNUMBER = 1;
    static final int SID_SUBJECTKEYIDENTIFIER = 2;
    static final String ATTR_MESSAGEDIGEST = "1.2.840.113549.1.9.4";
    static final String ATTR_SIGNINGTIME = "1.2.840.113549.1.9.5";
    static final String clazzName = "CMSSignedData";

    
    public static Scriptable jsConstructor(final Context ctx, final Object[] args, final Function ctorObj, final boolean inNewExpr) throws Exception {
        
        if (!(args.length > 0 && args[0] instanceof ByteString)) {
        	throw new RuntimeException("Constructor needs at least one argument, which must be of type ByteString");
        }
        
        
        ByteString encoded = (ByteString)args[0];
        final JsCmsSignedData sdo = new JsCmsSignedData();
        try {
        	sdo.setSignedDataFromBytes(encoded.getBytes());
        }
        catch (Exception e) {
            throw new RuntimeException("ByteString contains no valid encoded CMS signed data object", e);
        }
        return (Scriptable)sdo;
    }

	private void setSignedDataFromBytes(byte[] bytes) throws NoSuchFieldException, SecurityException, IllegalArgumentException, IllegalAccessException, CMSException {
    	signedDataExt = new CmsSignedDataExt(bytes); 
    	
    	Field f = JsCMSSignedData.class.getDeclaredField("sd");
		f.setAccessible(true);
		f.set(this, signedDataExt);		
	}

	public static void finishInit(final Scriptable scope, final FunctionObject ctor, final Scriptable proto) {
        ScriptableObject.defineProperty((Scriptable)ctor, "SID_ISSUERANDSERIALNUMBER", (Object)new Integer(1), 0);
        ScriptableObject.defineProperty((Scriptable)ctor, "SID_SUBJECTKEYIDENTIFIER", (Object)new Integer(2), 0);
        ScriptableObject.defineProperty((Scriptable)ctor, "ATTR_MESSAGEDIGEST", (Object)new String("1.2.840.113549.1.9.4"), 0);
        ScriptableObject.defineProperty((Scriptable)ctor, "ATTR_SIGNINGTIME", (Object)new String("1.2.840.113549.1.9.5"), 0);
    }
    
    public static Scriptable jsFunction_getSignedContent(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
    	return JsCMSSignedData.jsFunction_getSignedContent(cx, thisObj, args, funObj);
    }
    
    public static int jsFunction_getSignedDataVersion(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
        JsCmsSignedData cms = (JsCmsSignedData)thisObj;
        return cms.signedDataExt.getSignedData().getVersion().getValue().intValue();
    }
    
    public static Scriptable[] jsFunction_getSignedDataDigestAlgorithms(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
        JsCmsSignedData cms = (JsCmsSignedData)thisObj;
        ASN1Set oidList = cms.signedDataExt.getSignedData().getDigestAlgorithms();
        Enumeration<?> e = oidList.getObjects();
        ByteString[] digAlgOIDs = new ByteString[oidList.size()];
        int i = 0;
        while (e.hasMoreElements()) {
            final ASN1Sequence seq = (ASN1Sequence) e.nextElement();
            final DEREncodable entry = seq.getObjectAt(0);
            if (!(entry instanceof DERObjectIdentifier)) {
            	throw new RuntimeException("Set of DisgestAlgorithms does not contain OID at required position");
            }
            final DERObjectIdentifier oid = (DERObjectIdentifier)entry;
            final PrimitiveTLV tlv = new ObjectIdentifier(new ParseBuffer(oid.getEncoded()));
            digAlgOIDs[i++] = ByteString.newInstance(thisObj, tlv.getValue());
        }
        return (Scriptable[])digAlgOIDs;
    }
    
    public static Scriptable[] jsFunction_getSignedDataCertificates(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
    	return JsCMSSignedData.jsFunction_getSignedDataCertificates(cx, thisObj, args, funObj);
    }
    
    public static ByteString jsFunction_getEContentType(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
        JsCmsSignedData cms = (JsCmsSignedData)thisObj;
        DERObjectIdentifier oid = cms.signedDataExt.getSignedData().getEncapContentInfo().getContentType();
        PrimitiveTLV tlv = new ObjectIdentifier(new ParseBuffer(oid.getEncoded()));
        return ByteString.newInstance(thisObj, tlv.getValue());
    }
    
    public static int jsFunction_getNumberOfSigners(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
    	return JsCMSSignedData.jsFunction_getNumberOfSigners(cx, thisObj, args, funObj);
    }
    
    public static int jsFunction_getSignerInfoVersion(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
    	return JsCMSSignedData.jsFunction_getSignerInfoVersion(cx, thisObj, args, funObj);
    }
    
    public static int jsFunction_getSignerInfoSIDType(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
    	return JsCMSSignedData.jsFunction_getSignerInfoSIDType(cx, thisObj, args, funObj);
    }
    
    public static boolean jsFunction_isCertificateAvailable(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
    	return JsCMSSignedData.jsFunction_isCertificateAvailable(cx, thisObj, args, funObj);
    }
    
    public static Scriptable jsFunction_getCertificate(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
    	return JsCMSSignedData.jsFunction_getCertificate(cx, thisObj, args, funObj);
    }
    
    public static Scriptable jsFunction_getSignerInfoDigestAlgorithm(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
    	return JsCMSSignedData.jsFunction_getSignerInfoDigestAlgorithm(cx, thisObj, args, funObj);
    }
    
    public static Scriptable jsFunction_getSignerInfoSignedAttribute(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
    	return JsCMSSignedData.jsFunction_getSignerInfoSignedAttribute(cx, thisObj, args, funObj);
    }
    
    public static Scriptable jsFunction_getSignerInfoSignatureAlgorithm(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
    	return JsCMSSignedData.jsFunction_getSignerInfoSignatureAlgorithm(cx, thisObj, args, funObj);
    }
    
    public static Scriptable jsFunction_getSignerInfoSignature(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
    	return JsCMSSignedData.jsFunction_getSignerInfoSignature(cx, thisObj, args, funObj);
    }
    
    public static boolean jsFunction_isSignerInfoSignatureValid(final Context cx, final Scriptable thisObj, final Object[] args, final Function funObj) throws Exception {
    	return JsCMSSignedData.jsFunction_isSignerInfoSignatureValid(cx, thisObj, args, funObj);
    }
}
