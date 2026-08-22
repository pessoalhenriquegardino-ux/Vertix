export function adminClientTabs(clientId: string) {
  return [
    { href: `/admin/clients/${clientId}/dashboard`, label: "Pipeline" },
    { href: `/admin/clients/${clientId}/campaigns`, label: "Campanhas" },
    { href: `/admin/clients/${clientId}/crm`, label: "CRM" },
  ];
}
