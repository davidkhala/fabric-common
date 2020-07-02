package org.hyperledger.fabric.fabricCommon;

import org.bouncycastle.asn1.pkcs.PrivateKeyInfo;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.openssl.PEMParser;
import org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter;
import org.hyperledger.fabric.sdk.Enrollment;

import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.security.PrivateKey;

public abstract class AbstractEnrollment implements Enrollment {
    PrivateKey privateKey;
    String cert;

    @Override
    public PrivateKey getKey() {
        return privateKey;
    }

    @Override
    public String getCert() {
        return cert;
    }

    static PrivateKey getPrivateKeyFromBytes(byte[] data) throws IOException {
        final Reader pemReader = new StringReader(new String(data));

        final PrivateKeyInfo pemPair;
        try (PEMParser pemParser = new PEMParser(pemReader)) {
            pemPair = (PrivateKeyInfo) pemParser.readObject();
        }

        return new JcaPEMKeyConverter().setProvider(BouncyCastleProvider.PROVIDER_NAME).getPrivateKey(pemPair);
    }
}
