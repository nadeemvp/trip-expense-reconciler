# trip-expense-reconciler
The Multi-Currency Trip Expense Reconciler is a full-stack web application that allows a group of
people sharing costs — on a trip, a study-abroad programme, or a joint international project — to log
expenses in whatever currency they were actually paid in, and have the system reconcile everything
into a single settlement plan. Each expense is converted to a common base currency using the
historical exchange rate applicable on the date it occurred, rather than the rate at the time of
settlement, so the final numbers reflect what group members actually paid at the time.
Unlike a simple shared-expense list, the application is built around two non-trivial computations:
accurate historical currency conversion with a defined rounding policy, and a settlement-optimisation
algorithm that reduces a tangled web of mutual debts into the minimum possible number of
payments. This gives group members a transparent breakdown of what was spent, in which currency,
and exactly who needs to pay whom to settle up, instead of a confusing list of pairwise IOUs.