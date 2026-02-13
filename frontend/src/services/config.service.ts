import api from './api';

export interface WorkflowApprovalOptions {
  hierarchyTypes: { id: string; name: string }[];
  approvalLevelTypes: { id: string; name: string }[];
}

export interface WorkflowApprovalOptionsParams {
  organizationId?: string;
}

const configService = {
  getWorkflowApprovalOptions: async (
    params?: WorkflowApprovalOptionsParams
  ): Promise<WorkflowApprovalOptions> => {
    const { data } = await api.get<{ data: WorkflowApprovalOptions }>('/config/workflow-approval-options', {
      params: params?.organizationId ? { organizationId: params.organizationId } : {},
    });
    return data.data;
  },
};

export default configService;
