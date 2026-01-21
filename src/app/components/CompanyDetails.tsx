import { Globe, Mail, Phone, ExternalLink } from "lucide-react";

interface ContactItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  isExternal?: boolean;
}

const CompanyDetails = () => {
  const companyInfo = {
    name: "Trikona Technologies",
    tagline: "Innovative Solutions for Modern Businesses",
  };

  const contactItems: ContactItem[] = [
    {
      icon: <Globe className="h-5 w-5" />,
      label: "Website",
      value: "www.trikonatech.com",
      href: "https://www.trikonatech.com",
      isExternal: true,
    },
    {
      icon: <Mail className="h-5 w-5" />,
      label: "General Inquiries",
      value: "buildwithus@trikonatech.com",
      href: "mailto:buildwithus@trikonatech.com",
    },
    {
      icon: <Mail className="h-5 w-5" />,
      label: "Support",
      value: "buildwithus@trikonatech.com",
      href: "mailto:buildwithus@trikonatech.com",
    },
    {
      icon: <Phone className="h-5 w-5" />,
      label: "Phone",
      value: "+91 9620423719",
      href: "tel:+919620423719",
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
            {companyInfo.name}
          </h2>
          <p className="text-muted-foreground text-lg">
            {companyInfo.tagline}
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {contactItems.map((item, index) => (
            <div 
              key={index} 
              className="group bg-card hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon with gradient background */}
                  <div 
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground"
                    style={{ background: 'var(--gradient-primary)' }}
                  >
                    {item.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black mb-1">
                      {item.label}
                    </p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.isExternal ? "_blank" : undefined}
                        rel={item.isExternal ? "noopener noreferrer" : undefined}
                        className="text-black font-medium hover:text-primary transition-colors inline-flex items-center gap-1 group/link"
                      >
                        <span className="truncate">{item.value}</span>
                        {item.isExternal && (
                          <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        )}
                      </a>
                    ) : (
                      <p className="text-foreground font-medium">
                        {item.value}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CompanyDetails;
