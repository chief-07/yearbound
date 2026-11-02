module yearbound::vault {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::event;

    // --- Error Codes ---
    const ENotOwner: u64 = 0;
    const EVaultStillLocked: u64 = 1;
    const EZeroDeposit: u64 = 2;

    // --- Events ---
    public struct VaultCreated has copy, drop {
        vault_id: ID,
        owner: address,
        unlock_timestamp_ms: u64,
    }

    public struct PenaltyDeposited has copy, drop {
        vault_id: ID,
        amount: u64,
        total_balance: u64,
        depositor: address,
    }

    public struct VaultUnlocked has copy, drop {
        vault_id: ID,
        owner: address,
        released_amount: u64,
    }

    /// Personal time-locked savings vault enforcing broken commitment penalties.
    /// Money deposited remains inaccessible until unlock_timestamp_ms (e.g. Dec 31).
    public struct Vault has key, store {
        id: UID,
        owner: address,
        balance: Balance<SUI>,
        unlock_timestamp_ms: u64,
    }

    /// Initializes a new commitment vault for the sender.
    public entry fun create_vault(
        unlock_timestamp_ms: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let id = object::new(ctx);
        let vault_id = object::uid_to_inner(&id);

        let vault = Vault {
            id,
            owner: sender,
            balance: balance::zero<SUI>(),
            unlock_timestamp_ms,
        };

        event::emit(VaultCreated {
            vault_id,
            owner: sender,
            unlock_timestamp_ms,
        });

        transfer::share_object(vault);
    }

    /// Deposits a monetary penalty into the shared vault (called autonomously by agent via x402).
    public entry fun deposit_penalty(
        vault: &mut Vault,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        let amount = coin::value(&payment);
        assert!(amount > 0, EZeroDeposit);

        let payment_balance = coin::into_balance(payment);
        balance::join(&mut vault.balance, payment_balance);

        event::emit(PenaltyDeposited {
            vault_id: object::uid_to_inner(&vault.id),
            amount,
            total_balance: balance::value(&vault.balance),
            depositor: tx_context::sender(ctx),
        });
    }

    /// Allows the owner to reclaim all locked accumulated funds once unlock_timestamp_ms has passed.
    public entry fun withdraw(
        vault: &mut Vault,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == vault.owner, ENotOwner);
        assert!(clock::timestamp_ms(clock) >= vault.unlock_timestamp_ms, EVaultStillLocked);

        let amount = balance::value(&vault.balance);
        let withdrawn_balance = balance::split(&mut vault.balance, amount);
        let withdrawn_coin = coin::from_balance(withdrawn_balance, ctx);

        event::emit(VaultUnlocked {
            vault_id: object::uid_to_inner(&vault.id),
            owner: sender,
            released_amount: amount,
        });

        transfer::public_transfer(withdrawn_coin, sender);
    }

    // --- Read-only inspection helpers ---
    public fun get_balance(vault: &Vault): u64 {
        balance::value(&vault.balance)
    }

    public fun get_unlock_time(vault: &Vault): u64 {
        vault.unlock_timestamp_ms
    }

    public fun get_owner(vault: &Vault): address {
        vault.owner
    }
}
