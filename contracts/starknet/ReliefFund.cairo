// SPDX-License-Identifier: MIT
// Phase 3 stub: Relief disbursement contract surface for integration wiring.

#[starknet::interface]
trait IReliefFund<TContractState> {
    fn deposit(ref self: TContractState, donor: felt252, amount: u256);
    fn disburse(
        ref self: TContractState,
        ngo: felt252,
        amount: u256,
        world_id_nullifier: felt252,
        report_cid_hash: felt252,
        triage_hash: felt252,
    );
}

#[starknet::contract]
mod ReliefFund {
    use starknet::get_caller_address;
    use starknet::ContractAddress;
    use super::IReliefFund;

    #[storage]
    struct Storage {
        total_deposited: u256,
        total_disbursed: u256,
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Deposited: Deposited,
        Disbursed: Disbursed,
    }

    #[derive(Drop, starknet::Event)]
    struct Deposited {
        donor: felt252,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Disbursed {
        ngo: felt252,
        amount: u256,
        report_cid_hash: felt252,
        triage_hash: felt252,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl ReliefFundImpl of IReliefFund<ContractState> {
        fn deposit(ref self: ContractState, donor: felt252, amount: u256) {
            let current = self.total_deposited.read();
            self.total_deposited.write(current + amount);
            self.emit(Event::Deposited(Deposited { donor, amount }));
        }

        fn disburse(
            ref self: ContractState,
            ngo: felt252,
            amount: u256,
            world_id_nullifier: felt252,
            report_cid_hash: felt252,
            triage_hash: felt252,
        ) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'ONLY_OWNER');

            // Placeholder policy checks for Phase 3. Full verification wiring is next.
            assert(world_id_nullifier != 0, 'WORLD_ID_REQUIRED');
            assert(report_cid_hash != 0, 'CID_REQUIRED');
            assert(triage_hash != 0, 'TRIAGE_REQUIRED');

            let disbursed = self.total_disbursed.read();
            self.total_disbursed.write(disbursed + amount);
            self.emit(Event::Disbursed(Disbursed { ngo, amount, report_cid_hash, triage_hash }));
        }
    }
}
