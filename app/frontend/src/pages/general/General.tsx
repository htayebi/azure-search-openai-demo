import { useContext, useEffect, useRef, useState } from "react";
import { Panel, DefaultButton, Spinner } from "@fluentui/react";
import { Settings } from "../../components/Settings/Settings";
import { useMsal } from "@azure/msal-react";
import { useLogin, getToken, requireAccessControl } from "../../authConfig";
import { askApi, configApi, ChatAppResponse, ChatAppRequest, RetrievalMode, VectorFieldOptions, GPT4VInput, SpeechConfig } from "../../api";
import { LoginContext } from "../../loginContext";
import { useTranslation } from "react-i18next";
import { TokenClaimsDisplay } from "../../components/TokenClaimsDisplay";
import styles from "../ask/Ask.module.css";
import { SettingsButton } from "../../components/SettingsButton/SettingsButton";
import { QuestionInput } from "../../components/QuestionInput";
import { AnalysisPanel, AnalysisPanelTabs } from "../../components/AnalysisPanel";
import { Answer, AnswerError } from "../../components/Answer";

export function Component(): JSX.Element {
    const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
    const [promptTemplate, setPromptTemplate] = useState<string>("");
    const [promptTemplatePrefix, setPromptTemplatePrefix] = useState<string>("");
    const [promptTemplateSuffix, setPromptTemplateSuffix] = useState<string>("");
    const [temperature, setTemperature] = useState<number>(0.3);
    const [seed, setSeed] = useState<number | null>(null);
    const [minimumRerankerScore, setMinimumRerankerScore] = useState<number>(0);
    const [minimumSearchScore, setMinimumSearchScore] = useState<number>(0);
    const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>(RetrievalMode.Hybrid);
    const [retrieveCount, setRetrieveCount] = useState<number>(3);
    const [useSemanticRanker, setUseSemanticRanker] = useState<boolean>(true);
    const [useSemanticCaptions, setUseSemanticCaptions] = useState<boolean>(false);
    const [useGPT4V, setUseGPT4V] = useState<boolean>(false);
    const [gpt4vInput, setGPT4VInput] = useState<GPT4VInput>(GPT4VInput.TextAndImages);
    const [includeCategory, setIncludeCategory] = useState<string>("");
    const [excludeCategory, setExcludeCategory] = useState<string>("");
    const [question, setQuestion] = useState<string>("");
    const [vectorFieldList, setVectorFieldList] = useState<VectorFieldOptions[]>([VectorFieldOptions.Embedding, VectorFieldOptions.ImageEmbedding]);
    const [useOidSecurityFilter, setUseOidSecurityFilter] = useState<boolean>(false);
    const [useGroupsSecurityFilter, setUseGroupsSecurityFilter] = useState<boolean>(false);
    const [showGPT4VOptions, setShowGPT4VOptions] = useState<boolean>(false);
    const [showSemanticRankerOption, setShowSemanticRankerOption] = useState<boolean>(false);
    const [showVectorOption, setShowVectorOption] = useState<boolean>(false);
    const [showUserUpload, setShowUserUpload] = useState<boolean>(false);
    const [showLanguagePicker, setshowLanguagePicker] = useState<boolean>(false);
    const [showSpeechInput, setShowSpeechInput] = useState<boolean>(false);
    const [showSpeechOutputBrowser, setShowSpeechOutputBrowser] = useState<boolean>(false);
    const [showSpeechOutputAzure, setShowSpeechOutputAzure] = useState<boolean>(false);
    const audio = useRef(new Audio()).current;
    const [isPlaying, setIsPlaying] = useState(false);
    const client = useLogin ? useMsal().instance : undefined;
    const { loggedIn } = useContext(LoginContext);
    const { t, i18n } = useTranslation();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const lastQuestionRef = useRef<string>("");
    const [error, setError] = useState<unknown>();
    const [activeCitation, setActiveCitation] = useState<string>();
    const [activeAnalysisPanelTab, setActiveAnalysisPanelTab] = useState<AnalysisPanelTabs | undefined>(undefined);
    const [answer, setAnswer] = useState<ChatAppResponse>();
    const [speechUrls, setSpeechUrls] = useState<(string | null)[]>([]);
    const speechConfig: SpeechConfig = {
        speechUrls,
        setSpeechUrls,
        audio,
        isPlaying,
        setIsPlaying
    };
    const onShowCitation = (citation: string) => {
        if (activeCitation === citation && activeAnalysisPanelTab === AnalysisPanelTabs.CitationTab) {
            setActiveAnalysisPanelTab(undefined);
        } else {
            setActiveCitation(citation);
            setActiveAnalysisPanelTab(AnalysisPanelTabs.CitationTab);
        }
    };

    const onToggleTab = (tab: AnalysisPanelTabs) => {
        if (activeAnalysisPanelTab === tab) {
            setActiveAnalysisPanelTab(undefined);
        } else {
            setActiveAnalysisPanelTab(tab);
        }
    };

    const makeApiRequest = async (question: string) => {
        lastQuestionRef.current = question;

        error && setError(undefined);
        setIsLoading(true);
        setActiveCitation(undefined);
        setActiveAnalysisPanelTab(undefined);

        const token = client ? await getToken(client) : undefined;

        try {
            const request: ChatAppRequest = {
                messages: [
                    {
                        content: question,
                        role: "user"
                    }
                ],
                context: {
                    overrides: {
                        prompt_template: undefined,
                        prompt_template_prefix: undefined,
                        prompt_template_suffix: undefined,
                        include_category: undefined,
                        exclude_category: undefined,
                        top: undefined,
                        temperature: temperature,
                        minimum_reranker_score: minimumRerankerScore,
                        minimum_search_score: minimumSearchScore,
                        retrieval_mode: retrievalMode,
                        semantic_ranker: useSemanticRanker,
                        semantic_captions: useSemanticCaptions,
                        use_oid_security_filter: useOidSecurityFilter,
                        use_groups_security_filter: useGroupsSecurityFilter,
                        vector_fields: vectorFieldList,
                        use_gpt4v: useGPT4V,
                        gpt4v_input: gpt4vInput,
                        language: i18n.language,
                        ...(seed !== null ? { seed: seed } : {})
                    }
                },
                // AI Chat Protocol: Client must pass on any session state received from the server
                session_state: answer ? answer.session_state : null
            };
            const result = await askApi(request, token);
            setAnswer(result);
            setSpeechUrls([null]);
        } catch (e) {
            setError(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSettingsChange = (field: string, value: any) => {
        switch (field) {
            case "promptTemplate":
                setPromptTemplate(value);
                break;
            case "promptTemplatePrefix":
                setPromptTemplatePrefix(value);
                break;
            case "promptTemplateSuffix":
                setPromptTemplateSuffix(value);
                break;
            case "temperature":
                setTemperature(value);
                break;
            case "seed":
                setSeed(value);
                break;
            case "minimumRerankerScore":
                setMinimumRerankerScore(value);
                break;
            case "minimumSearchScore":
                setMinimumSearchScore(value);
                break;
            case "retrieveCount":
                setRetrieveCount(value);
                break;
            case "useSemanticRanker":
                setUseSemanticRanker(value);
                break;
            case "useSemanticCaptions":
                setUseSemanticCaptions(value);
                break;
            case "excludeCategory":
                setExcludeCategory(value);
                break;
            case "includeCategory":
                setIncludeCategory(value);
                break;
            case "useOidSecurityFilter":
                setUseOidSecurityFilter(value);
                break;
            case "useGroupsSecurityFilter":
                setUseGroupsSecurityFilter(value);
                break;
            case "useGPT4V":
                setUseGPT4V(value);
                break;
            case "gpt4vInput":
                setGPT4VInput(value);
                break;
            case "vectorFieldList":
                setVectorFieldList(value);
                break;
            case "retrievalMode":
                setRetrievalMode(value);
                break;
        }
    };

    return (
        <div>
            <div className={styles.askTopSection}>
                <div className={styles.commandsContainer}>
                    <SettingsButton className={styles.commandButton} onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)} />
                </div>
                <h1 className={styles.askTitle}>{t("askTitle")}</h1>
                <div className={styles.askQuestionInput}>
                    <QuestionInput
                        placeholder={t("gpt4vExamples.placeholder")}
                        disabled={isLoading}
                        initQuestion={question}
                        onSend={question => makeApiRequest(question)}
                        showSpeechInput={showSpeechInput}
                    />
                </div>
            </div>
            <div className={styles.askBottomSection}>
                {isLoading && <Spinner label={t("generatingAnswer")} />}
                {!isLoading && answer && !error && (
                    <div className={styles.askAnswerContainer}>
                        <Answer
                            answer={answer}
                            index={0}
                            speechConfig={speechConfig}
                            isStreaming={false}
                            onCitationClicked={x => onShowCitation(x)}
                            onThoughtProcessClicked={() => onToggleTab(AnalysisPanelTabs.ThoughtProcessTab)}
                            onSupportingContentClicked={() => onToggleTab(AnalysisPanelTabs.SupportingContentTab)}
                            showSpeechOutputAzure={showSpeechOutputAzure}
                            showSpeechOutputBrowser={showSpeechOutputBrowser}
                        />
                    </div>
                )}
                {error ? (
                    <div className={styles.askAnswerContainer}>
                        <AnswerError error={error.toString()} onRetry={() => makeApiRequest(lastQuestionRef.current)} />
                    </div>
                ) : null}
                {activeAnalysisPanelTab && answer && (
                    <AnalysisPanel
                        className={styles.askAnalysisPanel}
                        activeCitation={activeCitation}
                        onActiveTabChanged={x => onToggleTab(x)}
                        citationHeight="600px"
                        answer={answer}
                        activeTab={activeAnalysisPanelTab}
                    />
                )}
            </div>
            <Panel
                headerText={t("labels.headerText")}
                isOpen={isConfigPanelOpen}
                isBlocking={false}
                onDismiss={() => setIsConfigPanelOpen(false)}
                closeButtonAriaLabel={t("labels.closeButton")}
                onRenderFooterContent={() => <DefaultButton onClick={() => setIsConfigPanelOpen(false)}>{t("labels.closeButton")}</DefaultButton>}
                isFooterAtBottom={true}
            >
                <Settings
                    promptTemplate={promptTemplate}
                    promptTemplatePrefix={promptTemplatePrefix}
                    promptTemplateSuffix={promptTemplateSuffix}
                    temperature={temperature}
                    retrieveCount={retrieveCount}
                    seed={seed}
                    minimumSearchScore={minimumSearchScore}
                    minimumRerankerScore={minimumRerankerScore}
                    useSemanticRanker={useSemanticRanker}
                    useSemanticCaptions={useSemanticCaptions}
                    excludeCategory={excludeCategory}
                    includeCategory={includeCategory}
                    retrievalMode={retrievalMode}
                    useGPT4V={useGPT4V}
                    gpt4vInput={gpt4vInput}
                    vectorFieldList={vectorFieldList}
                    showSemanticRankerOption={showSemanticRankerOption}
                    showGPT4VOptions={showGPT4VOptions}
                    showVectorOption={showVectorOption}
                    useOidSecurityFilter={useOidSecurityFilter}
                    useGroupsSecurityFilter={useGroupsSecurityFilter}
                    useLogin={!!useLogin}
                    loggedIn={loggedIn}
                    requireAccessControl={requireAccessControl}
                    onChange={handleSettingsChange}
                />
                {useLogin && <TokenClaimsDisplay />}
            </Panel>
        </div>
    );
}

Component.displayName = "General";
