#!/usr/bin/env node
// Secreto aleatorio (48 bytes, base64url) para JWT_SECRET.
import { randomBytes } from 'node:crypto';
process.stdout.write(randomBytes(48).toString('base64url'));
