with open('src/components/layout/Navbar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("import { Menu, X, ShoppingCart }", "import { Menu, X, ShoppingCart, LayoutDashboard }")

target1 = """          {/* Cart Icon */}
          <Link href="/cart" className="relative p-2 text-foreground hover:bg-muted rounded-full transition-colors flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
            {cartItemsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 bg-primary text-[10px] font-bold text-white rounded-full ring-2 ring-background">
                {cartItemsCount}
              </span>
            )}
          </Link>"""

replacement1 = """          {/* Dashboard Icon (formerly Cart) */}
          <Link 
            href={status === 'authenticated' ? (session?.user?.role === 'ADMIN' ? '/admin' : session?.user?.role === 'ORGANIZER' ? '/organizer' : '/dashboard') : '/login'} 
            className="relative p-2 text-foreground hover:bg-muted rounded-full transition-colors flex items-center justify-center"
          >
            <LayoutDashboard className="w-5 h-5" />
          </Link>"""

text = text.replace(target1, replacement1)

target2 = """            {status === 'authenticated' ? (
              <>
                <Link
                  href={session?.user?.role === 'ADMIN' ? '/admin' : session?.user?.role === 'ORGANIZER' ? '/organizer' : '/dashboard'}
                  className="sm:hidden text-base font-medium px-4 py-3 rounded-lg hover:bg-secondary text-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              </>
            ) : ("""

replacement2 = """            <Link
              href="/cart"
              className="sm:hidden flex items-center justify-between text-base font-medium px-4 py-3 rounded-lg hover:bg-secondary text-foreground"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>Cart</span>
              {cartItemsCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 bg-primary text-[10px] font-bold text-white rounded-full">
                  {cartItemsCount}
                </span>
              )}
            </Link>

            {status === 'authenticated' ? (
              <>
              </>
            ) : ("""

text = text.replace(target2, replacement2)

with open('src/components/layout/Navbar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
