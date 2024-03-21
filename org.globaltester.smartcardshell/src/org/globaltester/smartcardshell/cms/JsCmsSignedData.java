package org.globaltester.smartcardshell.cms;

import java.lang.reflect.Field;
import java.util.Collection;
import java.util.Enumeration;
import java.util.Iterator;

import org.bouncycastle.asn1.ASN1Encodable;
import org.bouncycastle.asn1.ASN1ObjectIdentifier;
import org.bouncycastle.asn1.ASN1Sequence;
import org.bouncycastle.asn1.ASN1Set;
import org.bouncycastle.asn1.cms.SignedData;
import org.bouncycastle.cert.X509CertificateHolder;
import org.bouncycastle.cms.CMSException;
import org.bouncycastle.cms.CMSSignedData;
import org.bouncycastle.cms.SignerInformation;
import org.bouncycastle.cms.SignerInformationStore;
import org.bouncycastle.cms.jcajce.JcaSimpleSignerInfoVerifierBuilder;
import org.bouncycastle.util.Store;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.FunctionObject;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import de.cardcontact.scdp.cms.JsCMSSignedData;
import de.cardcontact.scdp.gp.ByteString;
import de.cardcontact.scdp.gp.GPError;
import de.cardcontact.scdp.js.JsX509;
import de.cardcontact.scdp.utils.ArgChecker;
import de.cardcontact.tlv.ObjectIdentifier;
import de.cardcontact.tlv.ParseBuffer;
import de.cardcontact.tlv.PrimitiveTLV;

/**
 * Extends JsCMSSignedData to access some of its internal encapsulated data.
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

	public static Scriptable jsConstructor(final Context ctx, final Object[] args, final Function ctorObj,
			final boolean inNewExpr) throws Exception {

		if (!(args.length > 0 && args[0] instanceof ByteString)) {
			throw new RuntimeException("Constructor needs at least one argument, which must be of type ByteString");
		}

		ByteString encoded = (ByteString) args[0];
		byte[] cmsSignedDataRaw = encoded.getBytes();
		return new JsCmsSignedData(cmsSignedDataRaw);
	}

	public JsCmsSignedData() {
		// nothing to do
	}

	public JsCmsSignedData(byte[] encoded) {
		try {
			setSignedDataFromBytes(encoded);
		} catch (Exception e) {
			throw new RuntimeException("ByteString contains no valid encoded CMS signed data object", e);
		}
	}

	private void setSignedDataFromBytes(byte[] bytes) throws NoSuchFieldException, SecurityException,
			IllegalArgumentException, IllegalAccessException, CMSException {
		signedDataExt = new CmsSignedDataExt(bytes);

		Field f = JsCMSSignedData.class.getDeclaredField("sd");
		f.setAccessible(true);
		f.set(this, signedDataExt);
	}

	public static void finishInit(final Scriptable scope, final FunctionObject ctor, final Scriptable proto) {
		ScriptableObject.defineProperty(ctor, "SID_ISSUERANDSERIALNUMBER", Integer.valueOf(1), 0);
		ScriptableObject.defineProperty(ctor, "SID_SUBJECTKEYIDENTIFIER", Integer.valueOf(2), 0);
		ScriptableObject.defineProperty(ctor, "ATTR_MESSAGEDIGEST", "1.2.840.113549.1.9.4", 0);
		ScriptableObject.defineProperty(ctor, "ATTR_SIGNINGTIME", "1.2.840.113549.1.9.5", 0);
	}

	public static Scriptable jsFunction_getSignedContent(final Context cx, final Scriptable thisObj,
			final Object[] args, final Function funObj) throws Exception {
		return JsCMSSignedData.jsFunction_getSignedContent(cx, thisObj, args, funObj);
	}

	public static int jsFunction_getSignedDataVersion(final Context cx, final Scriptable thisObj, final Object[] args,
			final Function funObj) throws Exception {
		JsCmsSignedData cms = (JsCmsSignedData) thisObj;
		return cms.signedDataExt.getSignedData().getVersion().getValue().intValue();
	}

	public static Scriptable[] jsFunction_getSignedDataDigestAlgorithms(final Context cx, final Scriptable thisObj,
			final Object[] args, final Function funObj) throws Exception {
		JsCmsSignedData cms = (JsCmsSignedData) thisObj;
		ASN1Set oidList = cms.signedDataExt.getSignedData().getDigestAlgorithms();
		Enumeration<?> e = oidList.getObjects();
		ByteString[] digAlgOIDs = new ByteString[oidList.size()];
		int i = 0;
		while (e.hasMoreElements()) {
			final ASN1Sequence seq = (ASN1Sequence) e.nextElement();
			final ASN1Encodable entry = seq.getObjectAt(0);
			if (!(entry instanceof ASN1ObjectIdentifier)) {
				throw new RuntimeException("Set of DisgestAlgorithms does not contain OID at required position");
			}
			final ASN1ObjectIdentifier oid = (ASN1ObjectIdentifier) entry;
			final PrimitiveTLV tlv = new ObjectIdentifier(new ParseBuffer(oid.getEncoded()));
			digAlgOIDs[i++] = ByteString.newInstance(thisObj, tlv.getValue());
		}
		return digAlgOIDs;
	}

	public static Scriptable[] jsFunction_getSignedDataCertificates(final Context cx, final Scriptable thisObj,
			final Object[] args, final Function funObj) throws Exception {
		return JsCMSSignedData.jsFunction_getSignedDataCertificates(cx, thisObj, args, funObj);
	}

	public static ByteString jsFunction_getEContentType(final Context cx, final Scriptable thisObj, final Object[] args,
			final Function funObj) throws Exception {
		JsCmsSignedData cms = (JsCmsSignedData) thisObj;
		ASN1ObjectIdentifier oid = cms.signedDataExt.getSignedData().getEncapContentInfo().getContentType();
		PrimitiveTLV tlv = new ObjectIdentifier(new ParseBuffer(oid.getEncoded()));
		return ByteString.newInstance(thisObj, tlv.getValue());
	}

	public static int jsFunction_getNumberOfSigners(final Context cx, final Scriptable thisObj, final Object[] args,
			final Function funObj) throws Exception {
		return JsCMSSignedData.jsFunction_getNumberOfSigners(cx, thisObj, args, funObj);
	}

	public static int jsFunction_getSignerInfoVersion(final Context cx, final Scriptable thisObj, final Object[] args,
			final Function funObj) throws Exception {
		return JsCMSSignedData.jsFunction_getSignerInfoVersion(cx, thisObj, args, funObj);
	}

	public static int jsFunction_getSignerInfoSIDType(final Context cx, final Scriptable thisObj, final Object[] args,
			final Function funObj) throws Exception {
		return JsCMSSignedData.jsFunction_getSignerInfoSIDType(cx, thisObj, args, funObj);
	}

	public static boolean jsFunction_isCertificateAvailable(final Context cx, final Scriptable thisObj,
			final Object[] args, final Function funObj) throws Exception {
		// return JsCMSSignedData.jsFunction_isCertificateAvailable(cx, thisObj, args,
		// funObj);
		ArgChecker.checkRange(thisObj, "CMSSignedData", args, 1, 1);
		int index = ArgChecker.getInt(thisObj, "CMSSignedData", args, 0, 0);
		JsCmsSignedData cms = (JsCmsSignedData) thisObj;
		SignerInformationStore signers = cms.signedDataExt.getSignerInfos();
		if (index < 0 || index >= signers.size())
			GPError.throwAsGPErrorEx(thisObj, GPError.INVALID_INDEX, index,
					"Index for isCertificateAvailable() out of range");
		Object[] allSigners = signers.getSigners().toArray();
		SignerInformation si = (SignerInformation) allSigners[index];
		Store<X509CertificateHolder> certs = cms.signedDataExt.getCertificates();
		Collection<X509CertificateHolder> certCollection = certs.getMatches(si.getSID());
		return !certCollection.isEmpty();
	}

	public static Scriptable jsFunction_getCertificate(final Context cx, final Scriptable thisObj, final Object[] args,
			final Function funObj) throws Exception {
		return JsCMSSignedData.jsFunction_getCertificate(cx, thisObj, args, funObj);
	}

	public static Scriptable jsFunction_getSignerInfoDigestAlgorithm(final Context cx, final Scriptable thisObj,
			final Object[] args, final Function funObj) throws Exception {
		return JsCMSSignedData.jsFunction_getSignerInfoDigestAlgorithm(cx, thisObj, args, funObj);
	}

	public static Scriptable jsFunction_getSignerInfoSignedAttribute(final Context cx, final Scriptable thisObj,
			final Object[] args, final Function funObj) throws Exception {
		return JsCMSSignedData.jsFunction_getSignerInfoSignedAttribute(cx, thisObj, args, funObj);
	}

	public static Scriptable jsFunction_getSignerInfoSignatureAlgorithm(final Context cx, final Scriptable thisObj,
			final Object[] args, final Function funObj) throws Exception {
		return JsCMSSignedData.jsFunction_getSignerInfoSignatureAlgorithm(cx, thisObj, args, funObj);
	}

	public static Scriptable jsFunction_getSignerInfoSignature(final Context cx, final Scriptable thisObj,
			final Object[] args, final Function funObj) throws Exception {
		return JsCMSSignedData.jsFunction_getSignerInfoSignature(cx, thisObj, args, funObj);
	}

	public static boolean jsFunction_isSignerInfoSignatureValid(final Context cx, final Scriptable thisObj,
			final Object[] args, final Function funObj) throws Exception {
		// return JsCMSSignedData.jsFunction_isSignerInfoSignatureValid(cx, thisObj,
		// args, funObj);
		ArgChecker.checkRange(thisObj, "CMSSignedData", args, 1, 2);
		int index = ArgChecker.getInt(thisObj, "CMSSignedData", args, 0, 0);
		X509CertificateHolder certHolder = null;
		if (args.length > 1) {
			if (args[1] instanceof ByteString) {
				ByteString signerCertificate = ArgChecker.getByteString(thisObj, "CMSSignedData", args, 1, null);
				try {
					certHolder = new X509CertificateHolder(signerCertificate.getBytes());
				} catch (Exception ce) {
					GPError.throwAsGPErrorEx(thisObj, GPError.INVALID_ENCODING, 0, ce.getLocalizedMessage());
				}
			} else if (args[1] instanceof JsX509) {
				certHolder = new X509CertificateHolder(((JsX509) args[1]).getCertificate().getEncoded());
			} else {
				GPError.throwAsGPErrorEx(thisObj, GPError.INVALID_ARGUMENTS, 1,
						"Argument must be of type ByteString or X509");
			}
		}
		JsCmsSignedData cms = (JsCmsSignedData) thisObj;
		return isSignerInfoSignatureValid(index, certHolder, cms);
	}

	public static boolean isSignerInfoSignatureValid(int index, X509CertificateHolder certHolder, JsCmsSignedData cms) {
		SignerInformationStore signers = cms.signedDataExt.getSignerInfos();
		if (index < 0 || index >= signers.size())
			GPError.throwAsGPErrorEx(cms, GPError.INVALID_INDEX, index,
					"Index for isSignerInfoSignatureValid() out of range");
		Object[] allSigners = signers.getSigners().toArray();
		SignerInformation si = (SignerInformation) allSigners[index];
		if (certHolder == null) {
			Store<X509CertificateHolder> certs = cms.signedDataExt.getCertificates();
			Collection<X509CertificateHolder> certCollection = certs.getMatches(si.getSID());
			if (certCollection.isEmpty())
				GPError.throwAsGPErrorEx(cms, GPError.OBJECT_NOT_FOUND, 0,
						"There are no signer certificates within the encoded CMS structure");
			Iterator<X509CertificateHolder> certIt = certCollection.iterator();
			certHolder = certIt.next();
		}
		boolean result = false;
		try {
			JcaSimpleSignerInfoVerifierBuilder builder = new JcaSimpleSignerInfoVerifierBuilder();
			result = si.verify(builder.setProvider("BC").build(certHolder));
			// System.out.println("verify result: " + result);
		} catch (Exception e) {
			e.printStackTrace();
			GPError.throwAsGPErrorEx(cms, GPError.CRYPTO_FAILED, 0, "Could not verify signer: " + e.getMessage());
		}
		return result;
	}
}
