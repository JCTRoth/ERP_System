package com.erp.scripting.graphql;

import com.erp.scripting.entity.Script;
import com.erp.scripting.entity.Script.ScriptType;
import com.erp.scripting.entity.Script.TriggerEvent;
import com.erp.scripting.entity.ScriptExecution;
import com.erp.scripting.service.ScriptService;
import com.netflix.graphql.dgs.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@DgsComponent
@RequiredArgsConstructor
public class ScriptDataFetcher {
    
    private final ScriptService scriptService;
    
    @DgsQuery
    public List<Script> scripts(@InputArgument String companyId) {
        return scriptService.findByCompany(UUID.fromString(companyId));
    }
    
    @DgsQuery
    public Script script(@InputArgument String id) {
        return scriptService.findById(UUID.fromString(id)).orElse(null);
    }
    
    @DgsQuery
    public List<ScriptExecution> scriptExecutions(
            @InputArgument String scriptId,
            @InputArgument Integer page,
            @InputArgument Integer size
    ) {
        PageRequest pageable = PageRequest.of(
                page != null ? page : 0,
                size != null ? size : 20,
                Sort.by(Sort.Direction.DESC, "startedAt")
        );
        return scriptService.getExecutionHistory(UUID.fromString(scriptId), pageable).getContent();
    }
    
    @DgsQuery
    public ScriptService.ScriptStats scriptStats(@InputArgument String scriptId) {
        return scriptService.getStats(UUID.fromString(scriptId));
    }
    
    @DgsMutation
    public Script createScript(@InputArgument Map<String, Object> input) {
        return scriptService.create(new ScriptService.CreateScriptRequest(
                UUID.fromString((String) input.get("companyId")),
                (String) input.get("name"),
                (String) input.get("description"),
                (String) input.get("code"),
                ScriptType.valueOf((String) input.get("type")),
                input.get("triggerEvent") != null ? TriggerEvent.valueOf((String) input.get("triggerEvent")) : null,
                (String) input.get("triggerEntity"),
                input.get("isActive") != null ? (Boolean) input.get("isActive") : true,
                input.get("createdBy") != null ? UUID.fromString((String) input.get("createdBy")) : null
        ));
    }
    
    @DgsMutation
    public Script updateScript(
            @InputArgument String id,
            @InputArgument Map<String, Object> input
    ) {
        return scriptService.update(UUID.fromString(id), new ScriptService.UpdateScriptRequest(
                (String) input.get("name"),
                (String) input.get("description"),
                (String) input.get("code"),
                input.get("type") != null ? ScriptType.valueOf((String) input.get("type")) : null,
                input.get("triggerEvent") != null ? TriggerEvent.valueOf((String) input.get("triggerEvent")) : null,
                (String) input.get("triggerEntity"),
                (Boolean) input.get("isActive"),
                input.get("updatedBy") != null ? UUID.fromString((String) input.get("updatedBy")) : null
        )).orElse(null);
    }
    
    @DgsMutation
    public Boolean deleteScript(@InputArgument String id) {
        return scriptService.delete(UUID.fromString(id));
    }
    
    @DgsMutation
    public ScriptExecutionResultDTO executeScript(
            @InputArgument String scriptId,
            @InputArgument Map<String, Object> input,
            @InputArgument String executedBy
    ) {
        ScriptService.ScriptExecutionResult result = scriptService.execute(
                UUID.fromString(scriptId),
                input,
                executedBy != null ? UUID.fromString(executedBy) : null
        );
        return new ScriptExecutionResultDTO(
                result.executionId().toString(),
                result.success(),
                result.result(),
                result.error(),
                result.executionTimeMs()
        );
    }
    
    @DgsMutation
    public List<ScriptExecutionResultDTO> executeTrigger(
            @InputArgument String companyId,
            @InputArgument String triggerEvent,
            @InputArgument String triggerEntity,
            @InputArgument Map<String, Object> data,
            @InputArgument String executedBy
    ) {
        List<ScriptService.ScriptExecutionResult> results = scriptService.executeTrigger(
                UUID.fromString(companyId),
                TriggerEvent.valueOf(triggerEvent),
                triggerEntity,
                data,
                executedBy != null ? UUID.fromString(executedBy) : null
        );
        
        return results.stream()
                .map(r -> new ScriptExecutionResultDTO(
                        r.executionId().toString(),
                        r.success(),
                        r.result(),
                        r.error(),
                        r.executionTimeMs()
                ))
                .toList();
    }
    
    public record ScriptExecutionResultDTO(
            String executionId,
            boolean success,
            Object result,
            String error,
            long executionTimeMs
    ) {}
}
