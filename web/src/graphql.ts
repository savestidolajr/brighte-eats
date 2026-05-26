import { gql } from "@apollo/client";

export interface Service { id: string; code: string; label: string; active?: boolean }
export interface ServiceInterestChange {
  id: string;
  action: string;     // "ADDED" | "REMOVED"
  serviceCode: string;
  source: string;     // "registration" | "admin_edit"
  changedAt: string;  // ISO
}
export interface Lead {
  id: string;
  name: string;
  email: string;
  mobile: string;
  postcode: string;
  suburb?: string | null;
  createdAt: string;
  services: Service[];
  history?: ServiceInterestChange[];
}
export interface LeadConnection {
  items: Lead[];
  totalCount: number;
  limit: number;
  offset: number;
}

export const ALL_SERVICES = gql`
  query AllServices {
    allServices { id code label active }
  }
`;

export const CREATE_SERVICE = gql`
  mutation CreateService($code: String!, $label: String!) {
    createService(code: $code, label: $label) { id code label active }
  }
`;

export const UPDATE_SERVICE = gql`
  mutation UpdateService($code: String!, $label: String!) {
    updateService(code: $code, label: $label) { id code label active }
  }
`;

export const SET_SERVICE_ACTIVE = gql`
  mutation SetServiceActive($code: String!, $active: Boolean!) {
    setServiceActive(code: $code, active: $active) { id code label active }
  }
`;

export const SERVICES = gql`
  query Services {
    services { id code label }
  }
`;

export const LEADS = gql`
  query Leads($limit: Int, $offset: Int, $service: String, $sortBy: LeadSort, $sortDir: SortDir) {
    leads(limit: $limit, offset: $offset, service: $service, sortBy: $sortBy, sortDir: $sortDir) {
      items { id name email mobile postcode createdAt services { id code label } }
      totalCount
      limit
      offset
    }
  }
`;

export const LEAD = gql`
  query Lead($id: ID!) {
    lead(id: $id) {
      id name email mobile postcode suburb createdAt
      services { id code label }
      history { id action serviceCode source changedAt }
    }
  }
`;

export const SET_LEAD_SERVICES = gql`
  mutation SetLeadServices($leadId: ID!, $services: [String!]!) {
    setLeadServices(leadId: $leadId, services: $services) {
      id
      services { id code label }
      history { id action serviceCode source changedAt }
    }
  }
`;

export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      id name email services { code label }
    }
  }
`;
