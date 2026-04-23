import React, { useState } from 'react';

interface FDDItemProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const ChevronIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

const FDDItem: React.FC<FDDItemProps> = ({ title, children, isOpen, onToggle }) => {
  return (
    <div className="border-b border-gray-700">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center text-left py-4 px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md"
        aria-expanded={isOpen}
      >
        <span className="text-lg font-semibold text-white">{title}</span>
        <ChevronIcon className={`w-6 h-6 text-gray-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}
      >
        <div className="pb-4 px-2 text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
};

const FDD_CONTENT = [
    { 
        title: 'Item 5 – Initial Fees', 
        content: `This section outlines the upfront costs you'll pay when joining the franchise system. It typically includes the initial franchise fee and may describe other one-time charges due before opening your shop, such as training fees and initial inventory. Item 5 helps you understand your initial financial commitment and what those fees cover.`
    },
    { 
        title: 'Item 6 – Other Fees', 
        content: `Item 6 details ongoing and additional fees you'll pay during the operation of your franchise. This includes royalties, marketing fund contributions, software fees, renewal fees, transfer fees, and other recurring costs. These are usually expressed as percentages of gross sales or fixed amounts. Reviewing this section helps you project monthly and annual operating expenses beyond the initial investment.`
    },
    { 
        title: 'Item 7 – Estimated Initial Investment', 
        content: `This section provides a comprehensive breakdown of total startup costs—from leasehold improvements and equipment to signage, inventory, and working capital. It's presented in a range format to account for different market conditions. Item 7 helps you estimate how much capital you'll need to open and operate your Creation Coffee location until it becomes self-sustaining.`
    },
    { 
        // FIX: Corrected a syntax error where a backtick was used instead of an apostrophe in the string literal.
        title: "Item 9 – Franchisee's Obligations", 
        content: `Item 9 summarizes your key responsibilities as a franchisee throughout the life of your agreement. It covers obligations such as site selection, compliance with brand standards, participation in training, payment of fees, and renewal procedures. This section often references other parts of the FDD or the franchise agreement where each obligation is described in more detail. Understanding Item 9 helps clarify what's expected of you as a franchise owner.`
    },
    { 
        title: 'Item 12 – Territory', 
        content: `This section explains the territorial rights granted to you under the franchise agreement. It specifies whether you'll receive a protected or exclusive territory, how that territory is defined, and under what circumstances the franchisor may open or sell additional locations nearby. Item 12 is crucial for understanding your market area and potential competition within the franchise system.`
    }
];

const FDDGuide: React.FC = () => {
    const [openItem, setOpenItem] = useState<string | null>('Item 5 – Initial Fees');

    const handleToggle = (title: string) => {
        setOpenItem(openItem === title ? null : title);
    };

    return (
        <div className="my-8 p-6 bg-gray-800/50 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-amber-500 mb-2">Understanding Your FDD</h3>
            <p className="text-gray-400 mb-6">The Franchise Disclosure Document (FDD) is a federally required document that provides detailed information about a franchise system. Below is an overview of key items to look for.</p>
            <div className="space-y-2">
                {FDD_CONTENT.map((item) => (
                    <FDDItem 
                        key={item.title} 
                        title={item.title}
                        isOpen={openItem === item.title}
                        onToggle={() => handleToggle(item.title)}
                    >
                        <p>{item.content}</p>
                    </FDDItem>
                ))}
            </div>
             <p className="mt-6 text-sm text-gray-500">
                <strong>In summary:</strong> Items 5, 6, 7, 9, and 12 collectively help you understand the financial requirements, operational expectations, and territorial structure of the franchise relationship.
            </p>
        </div>
    );
};

export default FDDGuide;