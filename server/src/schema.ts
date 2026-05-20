export const typeDefs = /* GraphQL */ `
  type Service {
    id: ID!
    code: String!
    label: String!
    active: Boolean!
  }

  type ServiceInterestChange {
    id: ID!
    serviceCode: String!
    action: String!
    source: String!
    changedAt: String!
  }

  type Lead {
    id: ID!
    name: String!
    email: String!
    mobile: String!
    postcode: String!
    createdAt: String!
    services: [Service!]!
    history: [ServiceInterestChange!]!
  }

  type LeadConnection {
    items: [Lead!]!
    totalCount: Int!
    limit: Int!
    offset: Int!
  }

  enum LeadSort {
    CREATED_AT
    NAME
  }

  enum SortDir {
    ASC
    DESC
  }

  input RegisterInput {
    name: String!
    email: String!
    mobile: String!
    postcode: String!
    services: [String!]!
  }

  type Query {
    leads(
      limit: Int = 20
      offset: Int = 0
      service: String
      sortBy: LeadSort = CREATED_AT
      sortDir: SortDir = DESC
    ): LeadConnection!
    lead(id: ID!): Lead
    services: [Service!]!
    allServices: [Service!]!
  }

  type Mutation {
    register(input: RegisterInput!): Lead!
    setLeadServices(leadId: ID!, services: [String!]!): Lead!
    createService(code: String!, label: String!): Service!
    updateService(code: String!, label: String!): Service!
    setServiceActive(code: String!, active: Boolean!): Service!
  }
`;
