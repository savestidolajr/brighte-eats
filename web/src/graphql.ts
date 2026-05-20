import { gql } from "@apollo/client";

export interface Service { id: string; code: string; label: string }
export interface Lead {
  id: string;
  name: string;
  email: string;
  mobile: string;
  postcode: string;
  createdAt: string;
  services: Service[];
}
export interface LeadConnection {
  items: Lead[];
  totalCount: number;
  limit: number;
  offset: number;
}

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
      id name email mobile postcode createdAt services { id code label }
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
