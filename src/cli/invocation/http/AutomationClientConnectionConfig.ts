/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface AutomationClientConnectionRequest {

    /**
     * Base endpoint, including port
     */
    baseEndpoint: string;

    user?: string;

    password?: string;

}

/**
 * How to connect to an automation client
 */
export interface AutomationClientConnectionConfig extends AutomationClientConnectionRequest {

    /** @deprecated replace when we don't use HTTP invocation from within service */
    workspaceId: string;

    /** @deprecated replace when we don't use HTTP invocation from within service */
    workspaceName: string;

    /**
     * Whether to display error stacks to console
     */
    showErrorStacks?: boolean;

}
