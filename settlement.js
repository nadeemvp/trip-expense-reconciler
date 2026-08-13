function calculateSettlement(balances) {
  const debtors = balances.filter(b => b.net < 0).map(b => ({ ...b }));
  const creditors = balances.filter(b => b.net > 0).map(b => ({ ...b }));

  debtors.sort((a, b) => a.net - b.net);
  creditors.sort((a, b) => b.net - a.net);

  const transactions = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(-debtor.net, creditor.net);
    const roundedAmount = parseFloat(amount.toFixed(2));

    if (roundedAmount > 0) {
      transactions.push({
        from: debtor.user_id,
        to: creditor.user_id,
        amount: roundedAmount
      });
    }

    debtor.net += amount;
    creditor.net -= amount;

    if (Math.abs(debtor.net) < 0.01) i++;
    if (Math.abs(creditor.net) < 0.01) j++;
  }

  return transactions;
}

module.exports = { calculateSettlement };