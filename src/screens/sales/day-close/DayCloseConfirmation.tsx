import React from 'react';
import {ConfirmDialog} from '../../../components/common/ConfirmDialog';

interface DayCloseConfirmationProps {
  visible: boolean;
  closing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const CONFIRM_MESSAGE =
  'All pending orders are settled and all tables are free. Close the restaurant and log out all employees? Staff can clock back in later from the same registered device.';

export function DayCloseConfirmation({
  visible,
  closing,
  onConfirm,
  onCancel,
}: DayCloseConfirmationProps) {
  return (
    <ConfirmDialog
      visible={visible}
      title="Close restaurant?"
      message={CONFIRM_MESSAGE}
      confirmLabel={closing ? 'Closing…' : 'Close Restaurant'}
      cancelLabel="Cancel"
      destructive
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
