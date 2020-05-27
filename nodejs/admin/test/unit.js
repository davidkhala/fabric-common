/* eslint-disable quotes */
const Policy = require('../policy');
const fabprotos = require('fabric-protos');
const policy = new Policy(fabprotos);
describe('policy parser', () => {

	it('orOfAnds', () => {
		const policyStr = `OR(AND('A.member', 'B.member'), 'C.member', AND('A.member', 'D.member'))`;
		policy.FromString(policyStr);
	});
	it('andOfOrs', () => {
		const policyStr = `AND('A.member', 'C.member', OR('B.member', 'D.member'))`;
		policy.FromString(policyStr);
	});
	it('orOfOrs', () => {
		const policyStr = `OR('A.member', OR('B.member', 'C.member'))`;
		policy.FromString(policyStr);
	});
	it('andOfAnds', () => {
		const policyStr = `AND('A.member', AND('B.member', 'C.member'), AND('D.member','A.member'))`;
		policy.FromString(policyStr);
	});
	it('RoleClausePattern', () => {
		const str = `'abc.org.member'`;
		const result = str.match(Policy.RoleClausePattern);
		console.debug(result);
	});

});

