'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface ServiceSelectorProps {
  selectedService: string;
  onServiceChange: (service: string) => void;
  availableServices: Set<string>;
  setIsUserSelectingService: (isSelecting: boolean) => void;
}

export default function ServiceSelector({ 
  selectedService, 
  onServiceChange, 
  availableServices,
  setIsUserSelectingService
}: ServiceSelectorProps) {
  // Utiliser availableServices pour déterminer les services à afficher
  const servicesToShow = Array.from(availableServices);

  return (
    <Select 
      value={selectedService} 
      onValueChange={(service) => {
        onServiceChange(service);
        setIsUserSelectingService(true);
      }}
    >
      <SelectTrigger className="bg-white border border-gray-300 rounded-md h-9 w-[250px] text-sm">
        <SelectValue placeholder="TOUT">
          {selectedService || "TOUT"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white border border-gray-300 rounded-md w-[250px]">
        {servicesToShow.map((service) => (
          <SelectItem
            key={service}
            value={service}
            className="text-sm hover:bg-gray-100"
          >
            {service}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
