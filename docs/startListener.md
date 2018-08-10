
If you start the Atomist lifecycle listener, you'll
see lifecycle messages from all Atomist SDM appear in its
console window.

Please type the following command:

```bash
atomist feed
```

To narrow your feed down to specific channels, use the optional
`channel` argument as follows:

```bash
atomist feed --channel=AccountService --channel=BillingService
```