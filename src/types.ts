// TypeScript interfaces for NeoStudio contract specifications

export interface ContractMetadata {
  name: string;
  symbol?: string;
  description?: string;
}

export interface ContractMethodParam {
  name: string;
  type: string;
}

export interface ContractVariable {
  id: string;
  name: string;
  type: string;
  initialValue?: string;
  description?: string;
}

export type Visibility = "public" | "private" | "admin";

export interface ContractMethod {
  id: string;
  name: string;
  visibility: Visibility;
  params: ContractMethodParam[];
  returns?: string;
  description?: string;
  steps?: string[];
}

export interface ContractEvent {
  id: string;
  name: string;
  params: ContractMethodParam[];
  description?: string;
}

export interface PermissionRule {
  id: string;
  name: string;
  description?: string;
}

export type ContractLanguage = "python" | "csharp";

export type ContractSpec = {
  id: string;
  metadata: ContractMetadata;
  variables: ContractVariable[];
  methods: ContractMethod[];
  events: ContractEvent[];
  permissions: PermissionRule[];
  language: ContractLanguage;
};

// React Flow node data
export type NeoStudioNodeData = {
  kind: "variable" | "method" | "event" | "permission" | "metadata";
  refId: string;
  title: string;
  subtitle?: string;
};

// API Response Types
export type NeoStatusResponse = {
  network: string;
  block_height: number;
  rpc_url?: string;
};

export type SimulateDeployResponse = {
  ok: boolean;
  action: string;
  neoResponse: any;
};

export type ContractSpecResponse = {
  spec: ContractSpec;
  agentMessage: string;
};

export type ContractCodeResponse = {
  code: string;
  language: ContractLanguage;
};

// Chat message type for conversation history
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
