with open(r'src/components/layout/Footer.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# We need to grab the social links part
socials = """            <div className="flex gap-4 pt-2">
              <Link href="https://www.instagram.com/circle.pass?stkn=MW1kMzhucnZ5enN1aQ==" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-medium">
                <InstagramIcon className="w-4 h-4" /> Instagram
              </Link>
              <Link href="https://www.tiktok.com/@circle.pass?_r=1&_t=ZS-99xQ4N6hnPO" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-medium">
                <Music2 className="w-4 h-4" /> TikTok
              </Link>
            </div>"""

old_layout = """        <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6">
          <div className="lg:col-span-3 space-y-4 pr-0 lg:pr-4">
            <Logo className="flex items-center space-x-2 mb-4" />
            <p className="text-muted-foreground text-sm max-w-xs hidden md:block">
              Your Pass to the next experience. Discover events, activate Voting, get your digital pass & show up for experiences that matter.
            </p>
            <div className="flex gap-4 pt-2">
              <Link href="https://www.instagram.com/circle.pass?stkn=MW1kMzhucnZ5enN1aQ==" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-medium">
                <InstagramIcon className="w-4 h-4" /> Instagram
              </Link>
              <Link href="https://www.tiktok.com/@circle.pass?_r=1&_t=ZS-99xQ4N6hnPO" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-medium">
                <Music2 className="w-4 h-4" /> TikTok
              </Link>
            </div>
          </div>
          
          <div className="lg:col-span-3 mt-6 lg:mt-0">
            <FooterNewsletter />
          </div>
          
          <div className="lg:col-span-6 grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 mt-6 lg:mt-0">"""

new_layout = """        <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6">
          
          <div className="lg:col-span-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
            <div className="lg:w-1/2 space-y-0 lg:space-y-4 pr-0 lg:pr-4">
              <Logo className="flex items-center space-x-2" />
              <p className="text-muted-foreground text-sm max-w-xs hidden lg:block mt-4">
                Your Pass to the next experience. Discover events, activate Voting, get your digital pass & show up for experiences that matter.
              </p>
            </div>
            
            <div className="lg:w-1/2 flex flex-col gap-4 mt-2 lg:mt-0">
              <FooterNewsletter />
              <div className="flex gap-4">
                <Link href="https://www.instagram.com/circle.pass?stkn=MW1kMzhucnZ5enN1aQ==" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-medium">
                  <InstagramIcon className="w-4 h-4" /> Instagram
                </Link>
                <Link href="https://www.tiktok.com/@circle.pass?_r=1&_t=ZS-99xQ4N6hnPO" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-medium">
                  <Music2 className="w-4 h-4" /> TikTok
                </Link>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-6 grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 mt-4 lg:mt-0">"""

text = text.replace(old_layout, new_layout)

with open(r'src/components/layout/Footer.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
