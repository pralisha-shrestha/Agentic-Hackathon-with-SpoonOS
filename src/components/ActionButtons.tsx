import React, { useState } from 'react';
import type { ContractSpec, SimulateDeployResponse } from '../types';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

interface ActionButtonsProps {
  spec: ContractSpec | null;
  code: string;
  onRegenerateCode: () => void;
  onExportCode: () => void;
  onSimulateDeploy: () => Promise<SimulateDeployResponse>;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  spec,
  code,
  onRegenerateCode,
  onExportCode,
  onSimulateDeploy,
}) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<SimulateDeployResponse | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployResult(null);
    try {
      const result = await onSimulateDeploy();
      setDeployResult(result);
      setShowDeployModal(true);
    } catch (error) {
      setDeployResult({
        ok: false,
        action: 'simulate_deploy',
        neoResponse: { error: String(error) },
      });
      setShowDeployModal(true);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2.5 p-4 bg-popover rounded-xl">
        <Button
          onClick={onRegenerateCode}
          disabled={!spec}
          variant="secondary"
          className="w-full justify-start"
        >
          🔄 Regenerate Code
        </Button>
        <Button
          onClick={onExportCode}
          disabled={!code}
          variant="secondary"
          className="w-full justify-start"
        >
          💾 Export Code
        </Button>
        <Button
          onClick={handleDeploy}
          disabled={!spec || isDeploying}
          className="w-full justify-start bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
        >
          {isDeploying ? '⏳ Deploying...' : '🚀 Deploy / Simulate on Neo'}
        </Button>
      </div>

      <Dialog open={showDeployModal && !!deployResult} onOpenChange={setShowDeployModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Deploy Simulation Result</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto">
            <div
              className={`p-3 rounded-lg font-semibold ${
                deployResult?.ok
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-destructive/20 text-destructive'
              }`}
            >
              {deployResult?.ok ? '✅ Success' : '❌ Error'}
            </div>
            <div className="text-foreground">
              <strong>Action:</strong> {deployResult?.action}
            </div>
            <div className="text-foreground">
              <strong>Neo Response:</strong>
              <pre className="mt-2 p-3 bg-card rounded-md overflow-x-auto text-sm border border-border">
                {JSON.stringify(deployResult?.neoResponse, null, 2)}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDeployModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActionButtons;

