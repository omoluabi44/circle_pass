with open(r'src/app/organizer/wallet/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

func_code = """  const handleDeleteBank = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm("Are you sure you want to remove this bank account?")) return;
    try {
      await deleteBankAccount(token, id);
      setBankAccounts(prev => prev.filter(a => a.id !== id));
      if (selectedAccount?.id === id) setSelectedAccount(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete bank account");
    }
  };

  const handleConfirmPayout"""

text = text.replace("const handleConfirmPayout", func_code)

ui_code_old = """                        {acct.is_default && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">Default</span>
                        )}
                      </label>"""

ui_code_new = """                        {acct.is_default && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">Default</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteBank(acct.id, e)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                          title="Delete Bank Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </label>"""

text = text.replace(ui_code_old, ui_code_new)

with open(r'src/app/organizer/wallet/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("done")
