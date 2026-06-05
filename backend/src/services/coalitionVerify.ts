import { ethers } from "ethers";

export function coalitionIntentHash(members: string[], taskId: bigint): string {
  return ethers.solidityPackedKeccak256(["address[]", "uint256"], [members, taskId]);
}

export function verifyCoalitionSignature(
  members: string[],
  taskId: bigint,
  agentAddress: string,
  signature: string,
): boolean {
  const digest = coalitionIntentHash(members, taskId);
  try {
    const recovered = ethers.verifyMessage(ethers.getBytes(digest), signature);
    return recovered.toLowerCase() === agentAddress.toLowerCase();
  } catch {
    return false;
  }
}

export function skillResultDigest(
  taskId: number,
  agentAddress: string,
  agentType: string,
  resultJson: string,
): string {
  const resultHash = ethers.keccak256(ethers.toUtf8Bytes(resultJson));
  return ethers.solidityPackedKeccak256(
    ["uint256", "address", "string", "bytes32"],
    [taskId, agentAddress, agentType, resultHash],
  );
}

export function verifySkillResultSignature(
  taskId: number,
  agentAddress: string,
  agentType: string,
  resultJson: string,
  signature: string,
): boolean {
  const digest = skillResultDigest(taskId, agentAddress, agentType, resultJson);
  try {
    const recovered = ethers.verifyMessage(ethers.getBytes(digest), signature);
    return recovered.toLowerCase() === agentAddress.toLowerCase();
  } catch {
    return false;
  }
}

export function executionDigest(
  taskId: number,
  agentAddress: string,
  targetContract: string,
  executionPayload: string,
): string {
  const payloadHash = ethers.keccak256(executionPayload.startsWith("0x") ? executionPayload : `0x${executionPayload}`);
  return ethers.solidityPackedKeccak256(
    ["uint256", "address", "address", "bytes32"],
    [taskId, agentAddress, targetContract, payloadHash],
  );
}

export function verifyExecutionSignature(
  taskId: number,
  agentAddress: string,
  targetContract: string,
  executionPayload: string,
  signature: string,
): boolean {
  const digest = executionDigest(taskId, agentAddress, targetContract, executionPayload);
  try {
    const recovered = ethers.verifyMessage(ethers.getBytes(digest), signature);
    return recovered.toLowerCase() === agentAddress.toLowerCase();
  } catch {
    return false;
  }
}
