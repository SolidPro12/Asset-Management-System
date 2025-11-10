-- Drop triggers if they exist
DROP TRIGGER IF EXISTS trigger_set_ticket_id ON public.tickets;
DROP TRIGGER IF EXISTS trigger_log_ticket_changes ON public.tickets;
DROP TRIGGER IF EXISTS log_asset_activity_trigger ON public.assets;
DROP TRIGGER IF EXISTS log_service_activity_trigger ON public.service_history;

-- Create trigger to auto-generate ticket ID
CREATE TRIGGER trigger_set_ticket_id
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_id();

-- Create trigger to log ticket changes
CREATE TRIGGER trigger_log_ticket_changes
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ticket_changes();

-- Create trigger to log asset activity
CREATE TRIGGER log_asset_activity_trigger
  AFTER INSERT OR UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_asset_activity();

-- Create trigger to log service activity
CREATE TRIGGER log_service_activity_trigger
  AFTER INSERT ON public.service_history
  FOR EACH ROW
  EXECUTE FUNCTION public.log_service_activity();