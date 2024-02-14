import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent } from '@material-ui/core';
import * as PropTypes from 'prop-types';
import {
    hideClaimRewardsDialog,
    setTokens,
    showDelegateFailedDialog,
    showDelegateSuccessDialog,
} from '../../../actions/stake';
import { connect } from 'react-redux';
import '../../Stake/DelegateDialog/index.css';
import ValidatorsSelectField from './ValidatorsSelectField';
import { signTxAndBroadcast } from '../../../helper';
import { showMessage } from '../../../actions/snackbar';
import { fetchRewards } from '../../../actions/accounts';
import { config } from '../../../config';
import variables from '../../../utils/variables';

const ClaimDialog = (props) => {
    const [inProgress, setInProgress] = useState(false);

    const handleClaimAll = () => {
        setInProgress(true);
        const count = props.rewards && props.rewards.rewards &&
            props.rewards.rewards.length * 50000 + config.DEFAULT_GAS;

        const updatedTx = {
            msgs: [],
            fee: {
                amount: [{
                    amount: String(config.DEFAULT_GAS * config.GAS_PRICE_STEP_AVERAGE),
                    denom: config.COIN_MINIMAL_DENOM,
                }],
                gas: String(count),
            },
            memo: '',
        };

        if (props.rewards && props.rewards.rewards &&
            props.rewards.rewards.length) {
            props.rewards.rewards.map((item) => {
                updatedTx.msgs.push({
                    typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
                    value: {
                        delegatorAddress: props.address,
                        validatorAddress: item.validator_address,
                    },
                });

                return null;
            });
        }

        signTxAndBroadcast(updatedTx, props.address, (error, result) => {
            setInProgress(false);
            if (error) {
                props.failedDialog();
                props.showMessage(error);
                return;
            }
            if (result) {
                props.setTokens(tokens);
                props.successDialog(result.transactionHash);
                props.fetchRewards(props.address);
            }
        });
    };

    const handleClaim = () => {
        setInProgress(true);
        const updatedTx = {
            msg: {
                typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
                value: {
                    delegatorAddress: props.address,
                    validatorAddress: props.value,
                    amount: {
                        denom: config.COIN_MINIMAL_DENOM,
                    },
                },
            },
            fee: {
                amount: [{
                    amount: String(config.DEFAULT_GAS * config.GAS_PRICE_STEP_AVERAGE),
                    denom: config.COIN_MINIMAL_DENOM,
                }],
                gas: String(config.DEFAULT_GAS),
            },
            memo: '',
        };

        signTxAndBroadcast(updatedTx, props.address, (error, result) => {
            setInProgress(false);
            if (error) {
                props.failedDialog();
                props.showMessage(error);
                return;
            }

            if (result) {
                props.setTokens(tokens);
                props.successDialog(result.transactionHash);
                props.fetchRewards(props.address);
            }
        });
    };

    const rewards = props.rewards && props.rewards.rewards &&
        props.rewards.rewards.length &&
        props.rewards.rewards.filter((value) => value.validator_address === props.value);

    let tokens = rewards && rewards.length && rewards[0] && rewards[0].reward &&
    rewards[0].reward.length && rewards[0].reward[0] && rewards[0].reward[0].amount
        ? rewards[0].reward[0].amount / 10 ** config.COIN_DECIMALS : 0;

    if (props.value === 'all' && props.rewards && props.rewards.rewards &&
        props.rewards.rewards.length) {
        let total = 0;

        props.rewards.rewards.map((value) => {
            const rewards = value.reward && value.reward[0] && value.reward[0].amount
                ? value.reward[0].amount / 10 ** config.COIN_DECIMALS : 0;
            total = rewards + total;

            return total;
        });

        tokens = total;
    }

    const disable = props.value === 'none' || inProgress;

    return (
        <Dialog
            aria-describedby="claim-dialog-description"
            aria-labelledby="claim-dialog-title"
            className="dialog delegate_dialog claim_dialog"
            open={props.open}
            onClose={props.handleClose}>
            <DialogContent className="content">
                <h1>Claim Rewards</h1>
                <p>Select validator</p>
                <ValidatorsSelectField/>
                {tokens && tokens > 0
                    ? <p>rewards: {tokens.toFixed(4)}</p>
                    : null}
            </DialogContent>
            <DialogActions className="footer">
                <Button
                    disabled={disable}
                    variant="contained"
                    onClick={props.value === 'all' ? handleClaimAll : handleClaim}>
                    {inProgress
                        ? variables[props.lang]['approval_pending']
                        : variables[props.lang].claim}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

ClaimDialog.propTypes = {
    failedDialog: PropTypes.func.isRequired,
    fetchRewards: PropTypes.func.isRequired,
    handleClose: PropTypes.func.isRequired,
    lang: PropTypes.string.isRequired,
    open: PropTypes.bool.isRequired,
    rewards: PropTypes.shape({
        rewards: PropTypes.array,
        total: PropTypes.array,
    }).isRequired,
    setTokens: PropTypes.func.isRequired,
    showMessage: PropTypes.func.isRequired,
    successDialog: PropTypes.func.isRequired,
    value: PropTypes.string.isRequired,
    address: PropTypes.string,
};

const stateToProps = (state) => {
    return {
        address: state.accounts.address.value,
        lang: state.language,
        open: state.stake.claimDialog.open,
        value: state.stake.claimDialog.validator,
        rewards: state.accounts.rewards.result,
    };
};

const actionToProps = {
    handleClose: hideClaimRewardsDialog,
    failedDialog: showDelegateFailedDialog,
    successDialog: showDelegateSuccessDialog,
    showMessage,
    fetchRewards,
    setTokens,
};

export default connect(stateToProps, actionToProps)(ClaimDialog);
