describe('HSM', () => {
	it('module load', async () => {
		require('fabric-common/lib/impl/bccsp_pkcs11');
	});

});
